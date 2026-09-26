---
title: OpenGL 入门学习（三）
tags:
  - 计算机系统基础
categories: CSAPP 学习
toc: true
date: 2026-09-26 09:07:13
summary:
description:
typora-root-url: OpenGL-入门学习（三）
typora-copy-images-to: OpenGL-入门学习（三）
---

---
## 写在前面

好想学习写一些狂霸酷炫拽的着色器啊。。。

部分内容为ai生成，如有错误恳请指出。

---

## 一、处理着色器

### 1.1 从文件中读取着色器源码

在上一篇博客里我们直接编写字符串作为着色器源码。这样很容易出错，而且修改起来也很不方便。所以我们这次直接在文件里编写着色器源码，再从文件里读取它。

#### 添加文件

在 OpenGL 下新建文件夹 res （表示 resource 资源文件夹），再新建文件夹 shaders，最后新建一个文件 Basic.shader。

使用新建项创建 .shader 文件的时候注意不要在紧凑视图里直接给文件改名然后添加，会显示没有对应模板然后无法在解决方案资源管理器里看到你创建出来的 .shader 文件。应该先点击显示所有模板，然后随便选一个模板（因为我们会自己更改后缀名，所以这里选什么模板都无所谓），然后再更改名称和添加文件。

![79038704028](/1790387040284.png)

![79038722376](/1790387223766.png)

![79038691354](/1790386913546.png)

#### 复制粘贴着色器源码

把我们在上一篇博客里编写过的着色器源码复制粘贴到 .shader 文件里。在每个着色器的源码前面加一行 #shader xxxx 来指明这是哪个着色器的源码。

> 善用 ctrl+h（替换字符）来删除源码里的 " 和 \n 符号。
>
> 在 visual studio 中一次性选中多行代码块，然后按 tab 键可以增加这些代码的缩进，按 shift+tab 键则可以减少缩进。

现在 Basic.shader 的内容应该是这样：

```
#shader vertex
#version 330 core
        
layout(location = 0) in vec4 position;
        
void main()
{
    gl_Position = position;
};

#shader fragment
#version 330 core
        
layout(location = 0) out vec4 color;
        
void main()
{
    color = vec4(1.0, 1.0, 0.0, 1.0);
};
```

#### 读取源码

现在回到我们的 Application.cpp ，我们需要读取 .shader 文件的内容并把它分成两个字符串。

我们到文件的开头去声明一个新函数 ParseShader 。别忘了加上 `#include <fstream>` 、`#include <sstream>` 和 `#include <string>`。

> 使用 ifstream 、stringstream 和 getline 函数来读取文件是 c++ 里非常常见的做法。可以自行去网络上搜索这些函数的具体使用方法，笔者就不在此处详细介绍了。

```c
#include <string>
#include <fstream>
#include <sstream>

static void ParseShader(const std::string& filepath) {
    std::ifstream stream(filepath);

    std::string line;
    std::stringstream ss[2];
    while (std::getline(stream, line)) {
        if (line.find("#shader") != std::string::npos) {
            if (line.find("vertex") != std::string::npos) {
                // set mode to vertex
            }
            else if (line.find("fragment") != std::string::npos) {
                // set mode to fragment
            }
        }
    }
}
```

以上就是这个函数的大致框架。其中 stream 和 line 用于逐行读取文件内容，ss 数组用来存放我们读取到的顶点着色器和片段着色器源码。

接下来我们来使用一个枚举类 ShaderType 来表示我们正在读取的代码属于哪个着色器源码。我们一行行的读取代码，如果它含有 "#shader"，我们就知道这行代码在指定着色器，于是设置对应的 ShaderType；如果它不含有 "#shader"，就说明这是一行源码，我们就把它加到 ss 里去。ss[0] 里存放的是顶点着色器的源码，ss[1] 里存放的是片段着色器的源码。

> 这里我们显式的将枚举类里的 VERTEX 和 FRAGMENT 声明为 0 和 1，这样方便我们在后面直接将它们转换成数组索引使用 。 

到这一步为止，函数的代码是这样的：

```c
static void ParseShader(const std::string& filepath) {
    std::ifstream stream(filepath);

    enum class ShaderType {
        NONE = -1, VERTEX = 0, FRAGMENT = 1
    };

    ShaderType type = ShaderType::NONE;
    std::string line;
    std::stringstream ss[2];
    while (std::getline(stream, line)) {
        if (line.find("#shader") != std::string::npos) {
            if (line.find("vertex") != std::string::npos) {
                type = ShaderType::VERTEX;
            }
            else if (line.find("fragment") != std::string::npos) {
                type = ShaderType::FRAGMENT;
            }
        }
        else {
            ss[(int)type] << line << '\n';
        }
    }
}
```

接下来我们要返回读取到的源码，由于我们要返回两个字符串，而返回值只能有一个，所以我们使用结构体来作为返回值。

```c
struct ShaderProgramSource {
    std::string VertexSource;
    std::string FragmentSource;
};

static ShaderProgramSource ParseShader(const std::string& filepath) {
    std::ifstream stream(filepath);

    enum class ShaderType {
        NONE = -1, VERTEX = 0, FRAGMENT = 1
    };

    ShaderType type = ShaderType::NONE;
    std::string line;
    std::stringstream ss[2];
    while (std::getline(stream, line)) {
        if (line.find("#shader") != std::string::npos) {
            if (line.find("vertex") != std::string::npos) {
                type = ShaderType::VERTEX;
            }
            else if (line.find("fragment") != std::string::npos) {
                type = ShaderType::FRAGMENT;
            }
        }
        else {
            ss[(int)type] << line << '\n';
        }
    }
    return { ss[0].str(), ss[1].str() };
}
```

以上就是读取源码要用到的代码了。

#### 使用我们读取的源码

把 Application.cpp 里的这两行给删掉，或者按 ctrl+/ 注释掉，因为我们用不上它们了：

```c
unsigned int shader = CreateShader(vertexShader, fragmentShader);
glUseProgram(shader);
```

别忘了把我们之前写的 vertexShader 和 fragmentShader 这俩字符串也删了。

接下来我们使用相对路径来指定要读取的文件：

```c
ShaderProgramSource source = ParseShader("res/shaders/Basic.shader");
```

需要注意的是，如果我们在 VS 以外的地方运行这个代码编译出的可执行文件，相对路径的根目录（也称作工作目录）将会是包含可执行文件的那个目录。但是在 VS 的调试器里运行这个程序的话，工作目录会被设置成 VS 调试器里配置的属性。

所以我们先来配置一下这个属性。依旧右键点击 OpenGL 文件夹打开项目的属性：

![79039090351](/1790390903514.png)

在 配置属性->调试 里找到工作目录这一栏，

![79039096450](/1790390964506.png)

我们看到工作目录被默认设置为项目目录，也就是包含 .vcxproj 文件的目录，就是 OpenGL 文件夹。

![79039116286](/1790391162861.png)

所以我们的相对路径是能正确读取到 /res/shaders/Basic.shader 文件的。

接着我们把读取到的源码打印出来，方便之后查看读取效果：

```c
std::cout << "VERTEX" << std::endl;
std::cout << source.VertexSource << std::endl;
std::cout << "FRAGMENT" << std::endl;
std::cout << source.FragmentSource << std::endl;
```

现在把编译着色器程序的这两行重新加上，注意把我们原本用的源码字符串换成我们新得到的存放在源码结构体里的字符：

```c
unsigned int shader = CreateShader(source.VertexSource, source.FragmentSource);
glUseProgram(shader);
```

按 F5 运行，应该能看到和之前一样的红色三角形了。

#### 修改着色器源码

现在我们可以很方便的直接在文件里修改着色器源码了。比如说，把片段着色器输出的颜色改一改：

```c
color = vec4(0.2, 0.3, 0.8, 1.0);
```

现在再运行程序，就能看到渲染出蓝色的三角形。

---

## 二、索引缓冲区

### 2.1 绘制正方形

#### 第一个实现

现在我们不止想画一个三角形了，我们还想画一个正方形。我们画正方形的方式是画两个拼在一起的三角形。

我们需要修改 positions 数组里的顶点坐标，需要修改创建的顶点缓冲区的大小，还需要修改 glDrawArrays 函数要绘制的顶点的数量。

```c
float positions[] = {
    -0.5f, -0.5f,
     0.5f, -0.5f,
     0.5f,  0.5f,

    -0.5f,  0.5f,
    -0.5f, -0.5f,
     0.5f,  0.5f
};
glBufferData(GL_ARRAY_BUFFER, 6 * 2 * sizeof(float), positions, GL_STATIC_DRAW);

// ...

glDrawArrays(GL_TRIANGLES, 0, 6);
```

现在按 F5 运行，可以看到窗口里出现一个正方形。准确来说是长方形，因为我们的窗口不是正方形的。

#### 使用索引缓冲区

我们的代码存在一些可以改进的问题。其中一个问题是，我们在 positions 里使用了重复的位置坐标，它们在显存里占据了不必要的空间。实际上我们只需要四个顶点，而不是六个。为了重复使用顶点，我们可以使用**索引缓冲区**（Index Buffer）。

我们先把 positions 数组删到只留下我们要用的四个顶点的坐标。然后我们创建一个无符号整形数组，这就是我们的索引缓冲区。在里面放六个索引，每个索引对应 positions 里我们要使用的一个顶点，和之前一样，按照绘制两个三角形的顺序排列好这些索引。

> indices 也可以声明为 unsigned short[] 或者 unsigned char[]，这样能更节省内存，不过能表示的索引数目也会更少。我们这里为了方便以后修改使用就直接声明为 unsigned int[] 了。

```c
float positions[] = {
    -0.5f, -0.5f,
     0.5f, -0.5f,
     0.5f,  0.5f,
    -0.5f,  0.5f,
};

unsigned int indices[] = {
    0, 1, 2,
    2, 3, 0
};
```

接下来我们生成一个索引缓冲区对象，和之前生成顶点缓冲区的步骤差不多。我们只需要把之前生成顶点缓冲区的代码复制下来，就粘贴在生成顶点缓冲区的代码的下方，然后再稍作修改。

```c
unsigned int buffer;
glGenBuffers(1, &buffer);
glBindBuffer(GL_ARRAY_BUFFER, buffer);
glBufferData(GL_ARRAY_BUFFER, 4 * 2 * sizeof(float), positions, GL_STATIC_DRAW);

// 生成和绑定索引缓冲区对象
unsigned int ibo;
glGenBuffers(1, &ibo);
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ibo);
glBufferData(GL_ELEMENT_ARRAY_BUFFER, 6 * 2 * sizeof(unsigned int), indices, GL_STATIC_DRAW);
```

注意 GL_ARRAY_BUFFER 要换成 GL_ELEMENT_ARRAY_BUFFER 。

最后我们还要把 DrawCall 指令从 glDrawArrays 换成 glDrawElements 。

```c
glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, nullptr);
```

注意这个函数有四个参数，第一个参数还是和之前一样写 GL_TRIANGLES，第二个参数是要绘制的索引的数量（而不是顶点的数量），第三个参数是索引缓冲区数组的数据类型，第四个参数是指向索引缓冲区的指针，不过因为我们已经绑定好索引缓冲区了，所以我们用不上传入指针，直接传 nullptr 就好。

现在按下 F5 运行，就能看到我们使用索引缓冲区绘制出的正方形了。

### 2.2 使用索引缓冲区的必要性

在绘制正方形的例子里，你可能会想：嘿，只是多存两个顶点而已，没什么大不了的，为什么要费这个劲去使用索引缓冲区呢？

但是在实际的项目中，一个建模可能由非常非常多的三角形组成，而对每一对三角形的连接处，你都要多使用两个重复的顶点。而且顶点的数据也会比我们现在使用的要大得多，除了位置信息，还可能包含纹理、法线等等属性。这个时候这些相同的顶点所占用的显存就不可忽视了。

实际上 99% 以上的时间我们都在使用索引缓冲区，而不是直接用顶点缓冲区。

---

## 三、错误处理

假设我们在上一章使用索引缓冲区的例子中犯了一个错误。我们在调用 glDrawElements 这个函数时，错误地传入了 GL_INT 而不是 GL_UNSIGNED_INT 。

```c
glDrawElements(GL_TRIANGLES, 6, GL_INT, nullptr);
```

那么这时候再按 F5 运行将不会看到任何正方形，只能看到一个黑屏的窗口。糟糕的是，我们完全不知道到底是哪一步出了问题，OpenGL 是如此脆弱，很多步骤稍有不慎都会导致渲染失败，而我们只能看到同样的黑屏。

我们要怎么做才能让 OpenGL 输出我们需要的错误信息，好让我们快速的找到错误出在哪里并修复它们？

### 3.1 glGetError 函数简介

第一种方法是调用 glGetError 函数。基本上，当我们在调用 OpenGL 函数时如果出了什么错误，OpenGL 内部会自动设置一个标志（对应一个整型错误码），然后使用 glGetError 就能让 OpenGL 把那个标志返回给我们。有时候代码可能有不止一个错误，这个时候 glGetError 会从多个错误码里随机挑一个给我们；我们可以通过反复调用 glGetError 来获取全部的错误码。

>  在 OpenGL 4.3 版本加入了一个新的函数 glMessageCallback，它允许你传入一个函数的指针，然后告诉你调用这个函数会导致什么错误。它不仅仅会返回一个错误码，还能给出一些英文的修改建议，这比 glGetError 函数要好使多了。不过这篇博客并不会讨论这个函数，因为它太新了，并不与 OpenGL 的每个版本都兼容。

在使用 glGetError 函数的时候，我们应该用循环来保证自己取到了所有的错误码，并且将所有的标志都重置。如果不这么做的话，可能在你某次调用函数以后使用 glGetError 取出了一个错误码，但你没有意识到的是，这并不是这次调用导致的，而是更久以前发生某次错误后没有及时重置的标志，这会导致你无法正确的处理错误。

### 3.2 错误处理代码的简单实现

所以如果我们想知道一个函数出了什么错误，我们应该在调用这个函数前先循环调用 glGetError 来确保之前的所有错误都被清理，然后再在调用这个函数之后循环调用 glGetError 把这个函数引起的所有错误码都取出来。

#### 清理错误

我们写一个 GLClearError 函数，这个函数将会在我们要调试的那个函数之前被调用，用于清理错误。

```c
static void GLClearError() {
    while (glGetError() != GL_NO_ERROR);
}
```

因为 GL_NO_ERROR 这个宏实际上就等于 0，所以你也可以写成

```c
static void GLClearError() {
    while (glGetError());
}
```

#### 打印错误

现在我们还需要一个函数，用来打印函数调用后发生的所有错误。

glGetError 将会返回一个 Glenum 枚举类型对象，它实际上就是个无符号整型。

```c
static void GLCheckError() {
    while (GLenum error = glGetError()) {
        std::cout << "[OpenGL Error] (" << error << ")" << std::endl;
    }
}
```

#### 错误处理实例

现在我们可以用自己实现的这些错误处理函数来找出代码里的错误了。

找到我们犯了错误的函数，在正确的位置调用错误处理函数：

```c
GLClearError();
glDrawElements(GL_TRIANGLES, 6, GL_INT, nullptr);
GLCheckError();
```

现在按 F5 运行。我们可以看到打印出的错误码是 1280 。

我们要找到这个错误码对应的错误究竟是什么。打开 glew.h 文件，ctrl+f 打开查找面板，因为错误码在文件里是以四位十六进制书写的，所以我们输入 0x0500，就能查找到错误码的宏定义了。

> 在 #include <GL/glew.h> 这一行点击 F12 可以快速跳转到 glew.h 文件。

![79042786295](/1790427862952.png)

可以看到宏的名字是 GL_INVALID_ENUM ，表示发生的错误是无效枚举。这确实就是我们犯的错误，因为我们在应该传入 GL_UNSIGNED_INT 的地方传入了 GL_INT 。

#### 这个实现的缺陷

虽然我们的错误处理函数确实可以轻松的找到错误，但是这是在我们已经知道错误发生在哪个函数的情况下。假如我们不知道错误具体发生在哪里，为了找出它，我们可能得对每一个函数都进行一遍错误处理流程——也就是在这个函数的前面一行调用 GLClearError ，在它的后面一行调用 GLCheckError。这实在是非常繁琐。

而且由于错误发生在 while 循环中，所以错误码会不停的打印在终端上，显示效果并不理想。

我们理想中的错误处理应该不仅仅能返回错误的类型，还能自动的找到错误出现在代码的哪里，并且停在发生错误的地方。这就是我们接下来要实现的内容。

### 3.3 更好的错误处理代码

#### GLLogCall 函数

我们来改造一下 GLCheckError 这个函数，并把它改名为 GLLogCall 。

```c
static bool GLLogCall() {
    if (GLenum error = glGetError()) {
        std::cout << "[OpenGL Error] (" << error << ")" << std::endl;
        return false;
    }
    return true;
}
```

现在这个函数将根据 glGetError 是否能取得错误而返回一个布尔值。

#### 断言

为了让代码在遇到错误的时候能立即中断并告知错误发生在哪一行，我们需要用到**断言**（assertion）。我们不会在这里深入讨论断言的使用，只讨论我们将要用到的部分。

```c
// 这句代码加在 #include 部分的下面
#define ASSERT(x) if (!(x)) __debugbreak()
```

这句代码定义了一个自定义的断言宏，它的作用是：如果 `x` 这个条件不成立（值 = false），就触发一个调试断点。

其中 `__debugbreak` 前面的 `__ ` 表示这是一个依赖于编译器的函数。因为我们使用的 IDE 是 Microsoft Visual Studio ，所以我们用的是 MSVC（微软的 VC 库）特有的函数，它在 clang、gcc 等任何其它编译器中都不起作用。

> 为什么 `!(x)` 中的 x 要用括号包裹起来？ 
>
> - `!(x)` 加括号是为了防止宏参数被替换后，因为运算符优先级导致错误结合。
> - 宏是文本替换，所以写宏时给参数加括号是最基本的防御措施。
>
> 如果写成：
>
> ```c
> #define ASSERT(x) if (!x) __debugbreak();
> ```
>
> 然后你这样用：
>
> ```c
> ASSERT(a == b);
> ```
>
> 展开后会变成：
>
> ```c
> if (!a == b) __debugbreak();
> ```
>
> 因为 `!` 的优先级高于 `==`，它实际被解析为：
>
> ```
> if ((!a) == b) __debugbreak();
> ```
>
> 这完全不是你的本意。你本来想判断 `a == b` 是否不成立，结果变成了判断 `(!a) == b`。

#### 用宏简化函数调用

我们把 `GLCheckError();` 这一行换成下面这个：

```c
ASSERT(GLLogCall());
```

然后按 F5 运行，会看到运行窗口只打印出一行错误码，而且调试器会自动在 ASSERT 这一行打断点并停在这一行。

不过我们不想再专门写这些函数调用了。让我们用宏来简化一下这个代码。

像下面这样定义一个宏：

```c
#define GLCall(x) GLClearError();\
    x;\
    ASSERT(GLLogCall())
```

其中 `\` 的作用是让编译器忽略末尾的换行符，这样我们就能把这个宏分成多行来写了。注意 `\` 后面不要有任何空格、直接接换行，不然的话换行符不会被忽略。

这个宏的作用是当我们写下 `GLCall(x);` 的时候（x 是一个函数调用，比方说 func()），编译器会自动展开成下面这样：

```c
GLClearError();
func();
ASSERT(GLLogCall());
```

这样我们就不用自己动手在函数前后调用清理函数和使用断言了。

现在我们把代码里的函数调用和错误处理改成下面这一行：

```c
GLCall(glDrawElements(GL_TRIANGLES, 6, GL_INT, nullptr));
```

再按 F5 运行，我们不仅能看到错误码，还能看到断点就打在我们调用函数的这一行上，看起来更加清楚了。

![79043150520](/1790431505203.png)

#### 在终端上打印更多信息

现在我们还希望程序能把一些错误信息打印在终端上，像是断点在哪一行、出现错误的函数名称和文件名称等等。虽然在调试器里，我们可以直接去看断点的位置，不过有时候我们可能会需要在终端上看到这些信息。

我们修改一下 GLLogCall 函数，让它能接收和打印更多参数：

```c
static bool GLLogCall(const char* function, const char* file, int line) {
    if (GLenum error = glGetError()) {
        std::cout << "[OpenGL Error] (" << error << "): " << function << " " << file <<  ":" << line << std::endl;
        return false;
    }
    return true;
}
```

回到我们的宏定义，来给 GLLogCall 函数传入对应的参数。可以用宏 `__FILE__` 和 `__LINE__` 指出我们调用这个函数的文件和行，和 `__debugbreak` 不同，这些宏应该被所有编译器所支持。在 x 前面加上 # 可以把这个函数调用 x 转换成一个字符串。

```c
#define GLCall(x) GLClearError();\
    x;\
    ASSERT(GLLogCall(#x, __FILE__, __LINE__))
```

现在再按 F5 运行，就能看到运行窗口的终端上打印出对应的信息了。

![79043225214](/1790432252146.png)

> 为了不在终端上显示太多垃圾信息，我把打印着色器源码的那几行删掉了。

现在我们可以用这个 GLCall 做到很多事情。我们可以用它分别包裹我们的每一个 OpenGL 函数调用，这样一旦哪里出了问题就能立刻看到这些非常有用的错误信息。不过我们的宏实现非常简陋，它还有一些 bug ，比方说在 if 语句后面使用它将会只把代码的第一行划入 if 语句的作用范围，还有被包裹变量的生命周期等等问题。可以通过一些手段去解决这些 bug，这里就不展开讲了。

---

## 参考资料

- [【双语】【TheCherno】OpenGL_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1Ni4y1o7Au/?spm_id_from=333.337.search-card.all.click&vd_source=b620703bd4c9a236a25ac8bf0c1f6f5c)

