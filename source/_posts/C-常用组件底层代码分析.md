---
title: C#常用组件底层代码分析
toc: true
tags:
  - C#基础
categories: Unity 基础学习
summary: 剖析 List 和 Dictionary 的底层源码实现，包括扩容机制、哈希拉链法等核心原理。
description: 剖析 List 和 Dictionary 的底层源码实现，包括扩容机制、哈希拉链法等核心原理。
typora-root-url: C-常用组件底层代码分析
abbrlink: 1942871416
date: 2026-07-20 15:40:02
---

---
## 写在前面

这个分类下的文章是我对 《Unity3D高级编程之进阶主程》一书的学习笔记。

这个博客对应的章节是 

- 第一章，C#要点技术(一) - List 底层源码剖析
- 第一章，C#要点技术(二) - Dictionary 底层源码剖析


部分内容为ai生成，如有错误恳请指出。

---

## 一、List

List 一般可以当做可伸缩数组来用，有时也能当链表用。泛型让它使用起来非常方便。

### 常见用法

```c#
// 创建与初始化
List<int> list = new List<int>();           // 空列表
List<int> list2 = new List<int>(100);       // 预分配容量

// 添加
list.Add(1);                                // 添加到末尾
list.AddRange(new int[] { 2, 3, 4 });       // 批量添加

// 访问
int first = list[0];                        // 索引访问

// 查找
int idx = list.IndexOf(3);                  // 线性查找，返回索引
bool has = list.Contains(2);                // 是否包含
int found = list.Find(x => x > 2);          // 条件查找

// 插入与删除
list.Insert(0, 0);                          // 指定位置插入
list.Remove(3);                             // 删除指定元素
list.RemoveAt(0);                           // 按索引删除

// 遍历
foreach (var item in list) { }              // foreach 遍历
for (int i = 0; i < list.Count; i++) { }    // for 遍历，推荐

// 其他
list.Sort();                                // 排序，O(n log n)
list.Clear();                               // 清空，不释放内部数组
int[] arr = list.ToArray();                 // 复制到新数组
```

### 底层代码剖析

#### List 的构造部分

```c#
public class List<T> : IList<T>, System.Collections.IList, IReadOnlyList<T>
{
    private const int _defaultCapacity = 4;

    private T[] _items;
    private int _size;
    private int _version;
    private Object _syncRoot;
    
    static readonly T[]  _emptyArray = new T[0];        
        
    // Constructs a List. The list is initially empty and has a capacity
    // of zero. Upon adding the first element to the list the capacity is
    // increased to 16, and then increased in multiples of two as required.
    public List() {
        _items = _emptyArray;
    }

    // Constructs a List with a given initial capacity. The list is
    // initially empty, but will have room for the given number of elements
    // before any reallocations are required.
    // 
    public List(int capacity) {
        if (capacity < 0) ThrowHelper.ThrowArgumentOutOfRangeException(ExceptionArgument.capacity, ExceptionResource.ArgumentOutOfRange_NeedNonNegNum);
        Contract.EndContractBlock();

        if (capacity == 0)
            _items = _emptyArray;
        else
            _items = new T[capacity];
    }

    //...
    //其他内容
}
```

可以看到 List 底层实现依托 `private T[] _items` 这个字段，是数组而非链表。无参初始化时会使用一个长度为 0 的数组。

那么它的可变长度是怎么实现的呢？

#### Add 接口源码

```c#
// Adds the given object to the end of this list. The size of the list is
// increased by one. If required, the capacity of the list is doubled
// before adding the new element.
//
public void Add(T item) {
    if (_size == _items.Length) EnsureCapacity(_size + 1);
    _items[_size++] = item;
    _version++;
}

// Ensures that the capacity of this list is at least the given minimum
// value. If the currect capacity of the list is less than min, the
// capacity is increased to twice the current capacity or to min,
// whichever is larger.
private void EnsureCapacity(int min) {
    if (_items.Length < min) {
        int newCapacity = _items.Length == 0? _defaultCapacity : _items.Length * 2;
        // Allow the list to grow to maximum possible capacity (~2G elements) before encountering overflow.
        // Note that this check works even when _items.Length overflowed thanks to the (uint) cast
        if ((uint)newCapacity > Array.MaxArrayLength) newCapacity = Array.MaxArrayLength;
        if (newCapacity < min) newCapacity = min;
        Capacity = newCapacity;
    }
}
```

可以看到，每次调用 `Add(T item)` 往 List 里添加元素的时候，List 会检查数组是否已满。如果没满就正常把元素加到维护好的尾部，满了则会调用 `EnsureCapacity` 函数来扩容。

注意看 `int newCapacity = _items.Length == 0? _defaultCapacity : _items.Length * 2;` 这一行。这一行意味着，如果数组当前容量为 0，则扩容为 `_defaultCapacity` = 4；否则，扩容到当前长度的两倍。因此整个扩充的路线为4，8，16，32，64，128，256，512，1024…依次类推。

这里代码并没有列出具体的扩容方法。我们都知道 `_items` 是个数组，它是定长的。所以简单来说，扩容实际上是重新 new 了个指定长度的数组，把原数组的内容一个个复制过去，最后再让 `_items` 指向新数组。旧数组就丢给 垃圾回收器 GC 回收了。

很显然，如果数组连续被替换掉会给 GC 造成不小的负担。另外，如果数量不得当也会浪费大量内存空间，比如当元素数量为 520 时，List 就会扩容到1024个元素，如果不使用剩余的504个空间单位，就造成了大部分的内存空间的浪费。

#### Remove 接口源码

```c#
// Removes the element at the given index. The size of the list is
// decreased by one.
// 
public bool Remove(T item) {
    int index = IndexOf(item);
    if (index >= 0) {
        RemoveAt(index);
        return true;
    }

    return false;
}

// Returns the index of the first occurrence of a given value in a range of
// this list. The list is searched forwards from beginning to end.
// The elements of the list are compared to the given value using the
// Object.Equals method.
// 
// This method uses the Array.IndexOf method to perform the
// search.
// 
public int IndexOf(T item) {
    Contract.Ensures(Contract.Result<int>() >= -1);
    Contract.Ensures(Contract.Result<int>() < Count);
    return Array.IndexOf(_items, item, 0, _size);
}

// Removes the element at the given index. The size of the list is
// decreased by one.
// 
public void RemoveAt(int index) {
    if ((uint)index >= (uint)_size) {
        ThrowHelper.ThrowArgumentOutOfRangeException();
    }
    Contract.EndContractBlock();
    _size--;
    if (index < _size) {
        Array.Copy(_items, index + 1, _items, index, _size - index);
    }
    _items[_size] = default(T);
    _version++;
}
```

从源码中可以看到，`Remove(T item)` 的原理实际上是：先用 `IndedxOf(T item)` 找出元素对应的索引 `index` ，然后再用挨个复制的方法把 `_item` 从 `index + 1` 开始的元素全部向前移一位，最后把 `_items[_size]` ，也就是原本尾部的位置，设为默认值。

这其中 `IndexOf` 启用的是 `Array.IndexOf` 接口来查找元素的索引位置，这个接口本身内部实现就是按索引顺序从0到n对每个位置的比较，复杂度为 O(n)。而 `Array.Copy` 的复杂度也是 O(n)。

#### Insert 接口源码

```c#
// Inserts an element into this list at a given index. The size of the list
// is increased by one. If required, the capacity of the list is doubled
// before inserting the new element.
// 
public void Insert(int index, T item) {
    // Note that insertions at the end are legal.
    if ((uint) index > (uint)_size) {
        ThrowHelper.ThrowArgumentOutOfRangeException(ExceptionArgument.index, ExceptionResource.ArgumentOutOfRange_ListInsert);
    }
    Contract.EndContractBlock();
    if (_size == _items.Length) EnsureCapacity(_size + 1);
    if (index < _size) {
        Array.Copy(_items, index, _items, index + 1, _size - index);
    }
    _items[index] = item;
    _size++;            
    _version++;
}
```

与Add接口一样，先检查容量是否足够，不足则扩容。从源码中获悉，Insert插入元素时，同样是用的 `Array.Copy` ，将数组里的指定元素后面的元素向后移动一个位置。

看到这里，我们可以明白了: List 的 `Add`，`Insert`，`IndexOf`，`Remove` 接口都是没有做过任何形式的优化，都使用的是顺序迭代的方式，如果过于频繁使用的话，会导致效率降低，也会造成不少内存的冗余，使得垃圾回收(GC) 时承担了更多的压力。

其他相关接口比如 `AddRange` ，`RemoveRange` 的原理和 `Add` 与 `Remove` 一样，区别只是多了几个元素，把单个元素变成了以容器为单位的形式进行操作。都是先检查容量是否合适，不合适则扩容，或者当 Remove 时先得到索引位置再整体的覆盖掉后面的的元素，容器本身大小不会变化，只是做了重复覆盖的操作。

#### 其他常用接口的复杂度

- `[]` 的实现，直接使用了数组的索引方式获取元素。O(1)

- `Clear()` 在调用时并不会删除数组，而只是将数组中的元素清零，并设置 `_size` 为 0 而已，用于虚拟地表明当前容量为 0。O(1)

- `Contains(T item)` 使用的是线性查找方式比较元素，对数组进行迭代，比较每个元素与参数的实例是否一致，如果一致则返回 true，全部比较结束还没有找到，则认为查找失败。O(n)

- `ToArray()` ，重新 new 了一个指定大小的数组，再将本身数组上的内容拷贝到新数组上，再返回出来。O(n)

- `Find(Predicate<T> match)` 使用的同样是线性查找，对每个元素都进行了比较。O(n)

#### Enumerator 枚举迭代部分的细节

**什么是 Enumerator**：Enumerator（枚举器/迭代器）是 C# 实现迭代器模式的结构体，提供 `MoveNext()` 和 `Current` 两个核心成员，让调用者可以按顺序逐个访问集合元素，而无需了解底层数据结构。C# 的 `foreach` 语法糖本质上就是通过 `GetEnumerator()` 获取枚举器，然后反复调用 `MoveNext()` 和 `Current` 实现的。

```c#
// Returns an enumerator for this list with the given
// permission for removal of elements. If modifications made to the list 
// while an enumeration is in progress, the MoveNext and 
// GetObject methods of the enumerator will throw an exception.
//
public Enumerator GetEnumerator() {
    return new Enumerator(this);
}

/// <internalonly/>
IEnumerator<T> IEnumerable<T>.GetEnumerator() {
    return new Enumerator(this);
}

System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
    return new Enumerator(this);
}

[Serializable]
public struct Enumerator : IEnumerator<T>, System.Collections.IEnumerator
{
    private List<T> list;
    private int index;
    private int version;
    private T current;

    internal Enumerator(List<T> list) {
        this.list = list;
        index = 0;
        version = list._version;
        current = default(T);
    }

    public void Dispose() {
    }

    public bool MoveNext() {

        List<T> localList = list;

        if (version == localList._version && ((uint)index < (uint)localList._size)) 
        {                                                     
            current = localList._items[index];                    
            index++;
            return true;
        }
        return MoveNextRare();
    }

    private bool MoveNextRare()
    {                
        if (version != list._version) {
            ThrowHelper.ThrowInvalidOperationException(ExceptionResource.InvalidOperation_EnumFailedVersion);
        }

        index = list._size + 1;
        current = default(T);
        return false;                
    }

    public T Current {
        get {
            return current;
        }
    }

    Object System.Collections.IEnumerator.Current {
        get {
            if( index == 0 || index == list._size + 1) {
                 ThrowHelper.ThrowInvalidOperationException(ExceptionResource.InvalidOperation_EnumOpCantHappen);
            }
            return Current;
        }
    }

    void System.Collections.IEnumerator.Reset() {
        if (version != list._version) {
            ThrowHelper.ThrowInvalidOperationException(ExceptionResource.InvalidOperation_EnumFailedVersion);
        }
        
        index = 0;
        current = default(T);
    }

}
```

可以看到，每次获取迭代器时都会返回一个 `new Enumerator(this)` , 如果大量使用迭代器的话，比如 `foreach` 就会产生大量的垃圾对象，所以说尽量不要用 `foreach`，因为 List 的 `foreach` 会增加一大堆新的 Enumerator 实例，最后由 GC 垃圾回收掉。

#### Sort 排序接口

```c#
// Sorts the elements in a section of this list. The sort compares the
// elements to each other using the given IComparer interface. If
// comparer is null, the elements are compared to each other using
// the IComparable interface, which in that case must be implemented by all
// elements of the list.
// 
// This method uses the Array.Sort method to sort the elements.
// 
public void Sort(int index, int count, IComparer<T> comparer) {
    if (index < 0) {
        ThrowHelper.ThrowArgumentOutOfRangeException(ExceptionArgument.index, ExceptionResource.ArgumentOutOfRange_NeedNonNegNum);
    }
    
    if (count < 0) {
        ThrowHelper.ThrowArgumentOutOfRangeException(ExceptionArgument.count, ExceptionResource.ArgumentOutOfRange_NeedNonNegNum);
    }
        
    if (_size - index < count)
        ThrowHelper.ThrowArgumentException(ExceptionResource.Argument_InvalidOffLen);
    Contract.EndContractBlock();

    Array.Sort<T>(_items, index, count, comparer);
    _version++;
}
```

它使用了 `Array.Sort` 接口进行排序，其中 `Array.Sort` 的源码我们也把它找出来。以下为 `Array.Sort` 使用的算法源码：

```c#
internal static void DepthLimitedQuickSort(T[] keys, int left, int right, IComparer<T> comparer, int depthLimit)
{
    do
    {
        if (depthLimit == 0)
        {
            Heapsort(keys, left, right, comparer);
            return;
        }

        int i = left;
        int j = right;

        // pre-sort the low, middle (pivot), and high values in place.
        // this improves performance in the face of already sorted data, or 
        // data that is made up of multiple sorted runs appended together.
        int middle = i + ((j - i) >> 1);
        SwapIfGreater(keys, comparer, i, middle);  // swap the low with the mid point
        SwapIfGreater(keys, comparer, i, j);   // swap the low with the high
        SwapIfGreater(keys, comparer, middle, j); // swap the middle with the high

        T x = keys[middle];
        do
        {
            while (comparer.Compare(keys[i], x) < 0) i++;
            while (comparer.Compare(x, keys[j]) < 0) j--;
            Contract.Assert(i >= left && j <= right, "(i>=left && j<=right)  Sort failed - Is your IComparer bogus?");
            if (i > j) break;
            if (i < j)
            {
                T key = keys[i];
                keys[i] = keys[j];
                keys[j] = key;
            }
            i++;
            j--;
        } while (i <= j);

        // The next iteration of the while loop is to "recursively" sort the larger half of the array and the
        // following calls recrusively sort the smaller half.  So we subtrack one from depthLimit here so
        // both sorts see the new value.
        depthLimit--;

        if (j - left <= right - i)
        {
            if (left < j) DepthLimitedQuickSort(keys, left, j, comparer, depthLimit);
            left = i;
        }
        else
        {
            if (i < right) DepthLimitedQuickSort(keys, i, right, comparer, depthLimit);
            right = j;
        }
    } while (left < right);
}
```

`Array.Sort` 使用的是快速排序方式进行排序，所以 List 的 `Sort` 排序的效率为 O(nlogn)。

### 总结

我们把大部分的接口都列了出来，差不多都分析了一遍，我们可以看到 List 的效率并不高，只是通用性强而已，大部分的算法都使用的是线性复杂度的算法，当遇到规模比较大的计算量级时就会导致 CPU 的大量损耗。

我们可以自己改进它，比如不再使用有线性算法的接口，自己重写一套，但凡要优化 List 中的线性算法的地方都使用我们自己制作的工具类。

List 的内存分配方式也极为不合理，当List里的元素不断增加时，会多次重新new数组，导致原来的数组被抛弃，最后当 GC 被调用时造成回收的压力。

我们可以使用 `List(int capacity)` 构造提前告知 List 对象最多会有多少元素在里面，这样的话 List 就不会因为空间不够而抛弃原有的数组，去重新申请数组了。

另外我们也可以从源码上看得出，代码是线程不安全的，它并没有对多线程下做任何锁或其他同步操作。并发情况下，无法判断 _size++ 的执行顺序，因此当我们在多线程间使用 List 时加上安全机制。

**List 并不是高效的组件，真实情况是，他比数组的效率还要差的多，他只是个兼容性比较强的组件而已，好用，但效率差。**

---

## 二、Dictionary

`Dictionary<TKey, TValue>` 可以方便地保存和读取键值对，和 C++ 中的 `map` 类似。泛型使得它支持各种类型，非常好用。

### 常见用法

```c#
// 创建与初始化
var dict = new Dictionary<string, int>();
var dict2 = new Dictionary<string, int>(100);  // 预分配容量，减少扩容

// 添加
dict.Add("apple", 10);                         // 添加键值对，重复键会抛异常
dict["banana"] = 20;                           // 索引器赋值，重复键会覆盖

// 查找
int val = dict["apple"];                       // 索引器获取，键不存在会抛异常
bool has = dict.ContainsKey("apple");          // 是否包含键，O(1)
if (dict.TryGetValue("apple", out int v)) { }  // 安全获取，推荐使用

// 遍历
foreach (var kvp in dict)                      // 遍历键值对
    Console.WriteLine($"{kvp.Key}: {kvp.Value}");
foreach (var key in dict.Keys) { }             // 只遍历键
foreach (var value in dict.Values) { }          // 只遍历值

// 删除
dict.Remove("apple");                          // 删除（不释放内存）

// 其他
dict.Clear();                                  // 清空
int count = dict.Count;                        // 元素数量
bool exists = dict.ContainsValue(10);          // 是否包含值，O(n)，不推荐常用
```

### 底层代码剖析

在对代码进行分析之前，先来简单讲讲 `Dictionary` 是怎么做到从 Key 键到 Value 值的映射的。

我们都知道，数组可以方便地进行 索引数字 → 存放元素 的映射。`Dictionary` 底层其实就是用数组实现的，只不过多了一步把键转换成索引数字的步骤而已。

这一步转换使用的就是 Hash 函数。Hash 函数有很多种算法，最简单的就是先把键转换成某个唯一对应的数字，然后再对数字进行取余操作，转换成一个可用的索引。

既然是取余操作，那么不同的键可能得到同一哈希地址。这种现象叫做 Hash 冲突（哈希冲突）。在一般情况下，冲突只能尽可能减少，而不能完全避免——毕竟要把范围很大的键空间映射到定长的索引空间里。

在处理 Hash 冲突的方法中通常有：开放定址法、再哈希法、链地址法、建立一个公共溢出区等。`Dictionary` 使用的解决冲突方法是**拉链法**，又称链地址法。

拉链法的原理：

> 底层数组 `T[]` 里不直接存放值，而是存放链表头指针，链表中才存放键值对。即：键映射到索引 `i` 的键值对，将全部被放在以 `T[i]` 为头结点的单链表中。`T` 中各分量的初值均为空指针。

在 Dictionary 中查找给定 Key 值对应的 Value 的方法如下：

> 给定 Key 值，根据哈希函数求得哈希地址（即数组索引）。如果该索引下是空指针，则查找不成功；否则遍历该索引下的链表，挨个比较 Key 值，直到找到匹配的记录或链表末尾为止。

我们来看看更形象的结构图，如下：

{% asset_img hash-table-chaining.svg 拉链法哈希表结构 %}

#### 对 Dictionary 的变量定义源码

```c#
public class Dictionary<TKey,TValue>: IDictionary<TKey,TValue>, IDictionary, IReadOnlyDictionary<TKey, TValue>, ISerializable, IDeserializationCallback 
{
    
    private struct Entry {
        public int hashCode;    // Lower 31 bits of hash code, -1 if unused
        public int next;        // Index of next entry, -1 if last
        public TKey key;           // Key of entry
        public TValue value;         // Value of entry
    }

    private int[] buckets;
    private Entry[] entries;
    private int count;
    private int version;
    private int freeList;
    private int freeCount;
    private IEqualityComparer<TKey> comparer;
    private KeyCollection keys;
    private ValueCollection values;
    private Object _syncRoot;
}
```

从继承的类和接口看，`Dictionary` 主要实现了 `IDictionary` 和 `ISerializable` 接口。在实际使用中，最常用的接口包括 `Add`、`Remove`、`ContainsKey`、`Clear`、`TryGetValue`、`Keys`、`Values`，以及 `[]` 索引器形式的读写接口，还包括 `Count`、`Contains` 等来自 `Collection` 的通用接口。

下面我们围绕上述接口逐一解析 `Dictionary` 的底层运作机制。

#### Add 接口

```c#
public void Add(TKey key, TValue value)
{
    Insert(key, value, true);
}

private void Initialize(int capacity)
{
    int size = HashHelpers.GetPrime(capacity);
    buckets = new int[size];
    for (int i = 0; i < buckets.Length; i++) buckets[i] = -1;
    entries = new Entry[size];
    freeList = -1;
}

private void Insert(TKey key, TValue value, bool add)
{
    if( key == null ) {
        ThrowHelper.ThrowArgumentNullException(ExceptionArgument.key);
    }

    if (buckets == null) Initialize(0);
    int hashCode = comparer.GetHashCode(key) & 0x7FFFFFFF;
    int targetBucket = hashCode % buckets.Length;

#if FEATURE_RANDOMIZED_STRING_HASHING
    int collisionCount = 0;
#endif

    for (int i = buckets[targetBucket]; i >= 0; i = entries[i].next) {
        if (entries[i].hashCode == hashCode && comparer.Equals(entries[i].key, key)) {
            if (add) { 
                ThrowHelper.ThrowArgumentException(ExceptionResource.Argument_AddingDuplicate);
            }
            entries[i].value = value;
            version++;
            return;
        } 

#if FEATURE_RANDOMIZED_STRING_HASHING
        collisionCount++;
#endif
    }
    int index;
    if (freeCount > 0) {
        index = freeList;
        freeList = entries[index].next;
        freeCount--;
    }
    else {
        if (count == entries.Length)
        {
            Resize();
            targetBucket = hashCode % buckets.Length;
        }
        index = count;
        count++;
    }

    entries[index].hashCode = hashCode;
    entries[index].next = buckets[targetBucket];
    entries[index].key = key;
    entries[index].value = value;
    buckets[targetBucket] = index;
    version++;

#if FEATURE_RANDOMIZED_STRING_HASHING

#if FEATURE_CORECLR
    // In case we hit the collision threshold we'll need to switch to the comparer which is using randomized string hashing
    // in this case will be EqualityComparer<string>.Default.
    // Note, randomized string hashing is turned on by default on coreclr so EqualityComparer<string>.Default will 
    // be using randomized string hashing

    if (collisionCount > HashHelpers.HashCollisionThreshold && comparer == NonRandomizedStringEqualityComparer.Default) 
    {
        comparer = (IEqualityComparer<TKey>) EqualityComparer<string>.Default;
        Resize(entries.Length, true);
    }
#else
    if(collisionCount > HashHelpers.HashCollisionThreshold && HashHelpers.IsWellKnownEqualityComparer(comparer)) 
    {
        comparer = (IEqualityComparer<TKey>) HashHelpers.GetRandomizedEqualityComparer(comparer);
        Resize(entries.Length, true);
    }
#endif // FEATURE_CORECLR

#endif

}
```

展示的代码稍多，我们摘出其中的要点，通过要点了解全局。

其实 `Add` 接口只是对 `Insert` 的一层封装——直接调用了 `Insert(key, value, true)`。那么 `Insert` 里做了什么呢？

首先，在加入数据前需要对数据结构进行构造：

```c#
if (buckets == null) Initialize(0);
```

`Dictionary` 构建时如果未指定容量，`buckets` 就是空的，所以需要初始化，`Initialize(0)` 说明初始容量按最小规格来。

不过奥妙就在 `Initialize` 函数里——如果传入的参数不是 0，而是 5、10、25 或其他更大的数量，那该构造多大的数组才合适呢？

`Initialize` 函数给出了答案，看下面这行：

```c#
int size = HashHelpers.GetPrime(capacity);
```

它们有专门的方法来计算到底该用多大的数组。我们来看 `HashHelpers` 的源码，其中 `primes` 数值是这样定义的：

```c#
public static readonly int[] primes = {
        3, 7, 11, 17, 23, 29, 37, 47, 59, 71, 89, 107, 131, 163, 197, 239, 293, 353, 431, 521, 631, 761, 919,
        1103, 1327, 1597, 1931, 2333, 2801, 3371, 4049, 4861, 5839, 7013, 8419, 10103, 12143, 14591,
        17519, 21023, 25229, 30293, 36353, 43627, 52361, 62851, 75431, 90523, 108631, 130363, 156437,
        187751, 225307, 270371, 324449, 389357, 467237, 560689, 672827, 807403, 968897, 1162687, 1395263,
        1674319, 2009191, 2411033, 2893249, 3471899, 4166287, 4999559, 5999471, 7199369};

public static int GetPrime(int min) 
{
    if (min < 0)
        throw new ArgumentException(Environment.GetResourceString("Arg_HTCapacityOverflow"));
    Contract.EndContractBlock();

    for (int i = 0; i < primes.Length; i++) 
    {
        int prime = primes[i];
        if (prime >= min) return prime;
    }

    //outside of our predefined table. 
    //compute the hard way. 
    for (int i = (min | 1); i < Int32.MaxValue;i+=2) 
    {
        if (IsPrime(i) && ((i - 1) % Hashtable.HashPrime != 0))
            return i;
    }
    return min;
}

// Returns size of hashtable to grow to.
public static int ExpandPrime(int oldSize)
{
    int newSize = 2 * oldSize;

    // Allow the hashtables to grow to maximum possible size (~2G elements) before encoutering capacity overflow.
    // Note that this check works even when _items.Length overflowed thanks to the (uint) cast
    if ((uint)newSize > MaxPrimeArrayLength && MaxPrimeArrayLength > oldSize)
    {
        Contract.Assert( MaxPrimeArrayLength == GetPrime(MaxPrimeArrayLength), "Invalid MaxPrimeArrayLength");
        return MaxPrimeArrayLength;
    }

    return GetPrime(newSize);
}
```

上述代码为 `HashHelpers` 部分的源码。其中 `GetPrime` 会从 `primes` 表中查找一个不小于传入值的最小质数，从而确定 `buckets` 和 `entries` 的实际大小。而 `ExpandPrime` 则更加简单粗暴——直接将原大小的 2 倍传给 `GetPrime`，取最接近的质数作为新容量。

从 `primes` 的定义可以看出，首次大小为 3，每次扩容大约变为原来的 2 倍，即 3 → 7 → 17 → 37 → …。底层数据结构的大小就是按这个序列增长的。除非你在创建 `Dictionary` 时预先指定了初始容量，这个值也会先被 `GetPrime` 计算得到实际应分配的数组大小。这和 `List` 的扩容思路如出一辙。

我们继续看初始化后的内容——对 Key 做哈希操作以获得地址索引：

```c#
int hashCode = comparer.GetHashCode(key) & 0x7FFFFFFF;
int targetBucket = hashCode % buckets.Length;
```

`& 0x7FFFFFFF` 是为了去掉最高位、确保哈希值为非负数；`% buckets.Length` 将哈希值映射到数组范围内，不会溢出。

紧接着，对目标 bucket 所在链表做遍历，检查是否有重复的 Key，同时也找到插入位置：

```c#
for (int i = buckets[targetBucket]; i >= 0; i = entries[i].next) {
    if (entries[i].hashCode == hashCode && comparer.Equals(entries[i].key, key)) {
        if (add) { 
            ThrowHelper.ThrowArgumentException(ExceptionResource.Argument_AddingDuplicate);
        }
        entries[i].value = value;
        version++;
        return;
    } 

#if FEATURE_RANDOMIZED_STRING_HASHING
    collisionCount++;
#endif
}
```

这一步就是前面所说的拉链法——通过 `buckets[targetBucket]` 获取链表头结点，沿 `entries[i].next` 遍历到尾端。同时，如果发现链表中已有 Key 相同的 Entry，则根据 `add` 参数决定是抛异常还是覆盖旧值。

如果数组空间不够了怎么办？源码中体现了这一点：

```c#
int index;
if (freeCount > 0) {
    index = freeList;
    freeList = entries[index].next;
    freeCount--;
}
else {
    if (count == entries.Length)
    {
        Resize();
        targetBucket = hashCode % buckets.Length;
    }
    index = count;
    count++;
}

entries[index].hashCode = hashCode;
entries[index].next = buckets[targetBucket];
entries[index].key = key;
entries[index].value = value;
buckets[targetBucket] = index;
```

当 `freeCount`（被标记为空闲的 Entry 数量）为 0 时，说明没有可复用的空位，若此时 `count == entries.Length` 则触发 `Resize` 扩容。扩容后的大小就是前面提到的 `ExpandPrime` 的计算结果——通常为原大小的 2 倍，再经 `GetPrime` 取到最接近的质数。

扩容后需要重新计算 `targetBucket`：因为 `buckets.Length` 变了，取余的结果自然也不同。

#### Remove 接口

删除的过程和插入类似——同样需要对 Key 做哈希操作获得数组索引，然后沿着拉链法查找匹配的 Entry，找到后将其从链表中摘下并标记为空闲。

```c#
public bool Remove(TKey key)
{
    if(key == null) {
        ThrowHelper.ThrowArgumentNullException(ExceptionArgument.key);
    }

    if (buckets != null) {
        int hashCode = comparer.GetHashCode(key) & 0x7FFFFFFF;
        int bucket = hashCode % buckets.Length;
        int last = -1;
        for (int i = buckets[bucket]; i >= 0; last = i, i = entries[i].next) {
            if (entries[i].hashCode == hashCode && comparer.Equals(entries[i].key, key)) {
                if (last < 0) {
                    buckets[bucket] = entries[i].next;
                }
                else {
                    entries[last].next = entries[i].next;
                }
                entries[i].hashCode = -1;
                entries[i].next = freeList;
                entries[i].key = default(TKey);
                entries[i].value = default(TValue);
                freeList = i;
                freeCount++;
                version++;
                return true;
            }
        }
    }
    return false;
}
```

`Remove` 的移除操作并没有释放内存，而是将对应 Entry 的 `hashCode` 设为 -1，`key` 和 `value` 设为 `default`，然后将该位置加入以 `freeList` 为头结点的空闲链表。被移除元素的下标由 `freeList` 记录，下次插入时优先复用这些空位，从而减少内存的频繁分配与回收。

#### ContainsKey 接口

```c#
public bool ContainsKey(TKey key)
{
    return FindEntry(key) >= 0;
}

private int FindEntry(TKey key)
{
    if( key == null) {
        ThrowHelper.ThrowArgumentNullException(ExceptionArgument.key);
    }

    if (buckets != null) {
        int hashCode = comparer.GetHashCode(key) & 0x7FFFFFFF;
        for (int i = buckets[hashCode % buckets.Length]; i >= 0; i = entries[i].next) {
            if (entries[i].hashCode == hashCode && comparer.Equals(entries[i].key, key)) return i;
        }
    }
    return -1;
}
```

从源码中可以看到，`ContainsKey` 本质上是调用了 `FindEntry` 函数来查找 Key 的位置。`FindEntry` 的查找方式跟前面相同：从 Key 的哈希地址开始，沿 `entries[i].next` 遍历冲突链表，找到匹配项即返回其索引，否则返回 -1。

有了对 `Add`、`Remove`、`ContainsKey` 这几个核心接口的理解，其他接口就相对简单了，我们快速过一遍。

#### TryGetValue 接口

```c#
public bool TryGetValue(TKey key, out TValue value)
{
    int i = FindEntry(key);
    if (i >= 0) {
        value = entries[i].value;
        return true;
    }
    value = default(TValue);
    return false;
}
```

与 `ContainsKey` 一样，它也是调用 `FindEntry` 来获取 Key 对应的 Value 值。不同的是，`TryGetValue` 通过 `out` 参数返回结果，避免了键不存在时抛出异常，是更推荐的安全查找方式。

#### [] 操作符

```c#
public TValue this[TKey key] {
    get {
        int i = FindEntry(key);
        if (i >= 0) return entries[i].value;
        ThrowHelper.ThrowKeyNotFoundException();
        return default(TValue);
    }
    set {
        Insert(key, value, false);
    }
}
```

`[]` 索引器的 `get` 同样调用 `FindEntry` 查找；`set` 则调用 `Insert(key, value, false)`，其中 `add=false` 表示若 Key 已存在则覆盖旧值而非抛异常。这也说明了 `dict["key"] = val` 和 `dict.Add("key", val)` 的一个重要区别：前者允许覆盖，后者在键重复时会抛异常。

可以看到，从 `Add`、`Remove`、`ContainsKey`、`TryGetValue` 到 `[]` 操作符，无一例外都依赖哈希取余定位 + 拉链法遍历这一套组合。哈希函数的好坏直接决定了冲突的多少，进而决定了整体性能。

既然哈希函数这么关键，我们来看看它是如何创建的：

```c#
private static EqualityComparer<T> CreateComparer()
{
    Contract.Ensures(Contract.Result<EqualityComparer<T>>() != null);

    RuntimeType t = (RuntimeType)typeof(T);
    // Specialize type byte for performance reasons
    if (t == typeof(byte)) {
        return (EqualityComparer<T>)(object)(new ByteEqualityComparer());
    }
    // If T implements IEquatable<T> return a GenericEqualityComparer<T>
    if (typeof(IEquatable<T>).IsAssignableFrom(t)) {
        return (EqualityComparer<T>)RuntimeTypeHandle.CreateInstanceForAnotherGenericParameter((RuntimeType)typeof(GenericEqualityComparer<int>), t);
    }
    // If T is a Nullable<U> where U implements IEquatable<U> return a NullableEqualityComparer<U>
    if (t.IsGenericType && t.GetGenericTypeDefinition() == typeof(Nullable<>)) {
        RuntimeType u = (RuntimeType)t.GetGenericArguments()[0];
        if (typeof(IEquatable<>).MakeGenericType(u).IsAssignableFrom(u)) {
            return (EqualityComparer<T>)RuntimeTypeHandle.CreateInstanceForAnotherGenericParameter((RuntimeType)typeof(NullableEqualityComparer<int>), u);
        }
    }
    
    // See the METHOD__JIT_HELPERS__UNSAFE_ENUM_CAST and METHOD__JIT_HELPERS__UNSAFE_ENUM_CAST_LONG cases in getILIntrinsicImplementation
    if (t.IsEnum) {
        TypeCode underlyingTypeCode = Type.GetTypeCode(Enum.GetUnderlyingType(t));

        // Depending on the enum type, we need to special case the comparers so that we avoid boxing
        // Note: We have different comparers for Short and SByte because for those types we need to make sure we call GetHashCode on the actual underlying type as the 
        // implementation of GetHashCode is more complex than for the other types.
        switch (underlyingTypeCode) {
            case TypeCode.Int16: // short
                return (EqualityComparer<T>)RuntimeTypeHandle.CreateInstanceForAnotherGenericParameter((RuntimeType)typeof(ShortEnumEqualityComparer<short>), t);
            case TypeCode.SByte:
                return (EqualityComparer<T>)RuntimeTypeHandle.CreateInstanceForAnotherGenericParameter((RuntimeType)typeof(SByteEnumEqualityComparer<sbyte>), t);
            case TypeCode.Int32:
            case TypeCode.UInt32:
            case TypeCode.Byte:
            case TypeCode.UInt16: //ushort
                return (EqualityComparer<T>)RuntimeTypeHandle.CreateInstanceForAnotherGenericParameter((RuntimeType)typeof(EnumEqualityComparer<int>), t);
            case TypeCode.Int64:
            case TypeCode.UInt64:
                return (EqualityComparer<T>)RuntimeTypeHandle.CreateInstanceForAnotherGenericParameter((RuntimeType)typeof(LongEnumEqualityComparer<long>), t);
        }
    }
    // Otherwise return an ObjectEqualityComparer<T>
    return new ObjectEqualityComparer<T>();
}
```

`CreateComparer` 根据类型 `T` 的不同，分四种情况进行处理：

1. **`byte` 类型**：直接使用 `ByteEqualityComparer`，为字节比较做了特化优化。
2. **实现了 `IEquatable<T>` 的类型**：使用 `GenericEqualityComparer<T>`，通过泛型接口直接比较，避免装箱。
3. **`Nullable<U>` 且 U 实现了 `IEquatable<U>`**：使用 `NullableEqualityComparer<U>`。
4. **枚举类型**：根据底层类型（`short`、`sbyte`、`int`、`long` 等）选择对应的枚举比较器，同样是为了避免装箱。
5. **以上都不满足**：回退到 `ObjectEqualityComparer<T>`，使用 `Object` 类的 `Equals` 方法。

在 C# 里所有类最终都继承自 `Object`，所以如果没有重写 `Equals`，就会使用 `Object` 类的默认实现：

```c#
public virtual bool Equals(Object obj)
{
    return RuntimeHelpers.Equals(this, obj);
}

[System.Security.SecuritySafeCritical]
[ResourceExposure(ResourceScope.None)]
[MethodImplAttribute(MethodImplOptions.InternalCall)]
public new static extern bool Equals(Object o1, Object o2);
```

可以看到，默认的 `Equals` 比较的是两个对象的**内存地址**。对于引用类型作为 Key 的情况，如果两个对象在逻辑上相等但内存地址不同（比如两个 `new` 出来的独立实例），默认的 `Equals` 会认为它们不相等。这就是为什么使用引用类型作为 Key 时，往往需要自己重写 `Equals` 和 `GetHashCode`，也解释了为什么值类型作为 Key 更高效——值类型都实现了 `IEquatable<T>` ，比较器经过了专门优化，无需额外装箱和反射。

#### 线程安全

`Dictionary` 同 `List` 一样并不是线程安全的。官方源码中对此进行了说明：

> Hashtable has multiple reader/single writer (MR/SW) thread safety built into certain methods and properties, whereas Dictionary doesn't. If you're converting framework code that formerly used Hashtable to Dictionary, it's important to consider whether callers may have taken a dependence on MR/SW thread safety. If a reader writer lock is available, then that may be used with a Dictionary to get the same thread safety guarantee.

`Hashtable` 在多线程读写中是线程安全的，而 `Dictionary` 不是。如果要在多个线程间共享 `Dictionary` 的读写操作，就需要自己添加 `lock` 等同步机制来保证线程安全。

### 总结

Dictionary 由数组构成，通过哈希函数完成地址映射，使用拉链法解决哈希冲突。

从效率上看，同 List 一样，最好在实例化时尽量确定大致数量以减少扩容开销；另外用值类型做 Key 比用类实例做 Key 更加高效，因为值类型的哈希和比较函数经过了专门优化。

从内存操作上看，底层数组大小按 3 → 7 → 17 → 37 → … 的顺序（每次约 2 倍）增长；删除元素时仅将对应 Entry 标记为空闲，并不会缩减已分配的内存。

另外，Dictionary 并非线程安全。如果需要在多线程间共享读写操作，需要自己实现 lock 等同步机制。

---

## 参考资料

- [《Unity3D高级编程之进阶主程》第一章，C#要点技术(一) - List 底层源码剖析 - 技术人生 - 编程技术 - JESSE人生](http://www.luzexi.com/2018/07/06/Unity3D%E9%AB%98%E7%BA%A7%E7%BC%96%E7%A8%8B%E4%B9%8B%E8%BF%9B%E9%98%B6%E4%B8%BB%E7%A8%8B-CSharp%E8%A6%81%E7%82%B9%E6%8A%80%E6%9C%AF1)