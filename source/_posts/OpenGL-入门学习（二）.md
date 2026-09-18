---
title: OpenGL 入门学习（二）
tags:
  - 图形学基础
  - OpenGL
categories: OpenGL 学习
toc: true
abbrlink: 2362560336
date: 2026-09-18 19:10:31
summary: 用 GLEW 取到现代 OpenGL 函数，再借助顶点缓冲区、顶点属性和着色器画出第一个三角形。
description: >-
  承接上篇配置好的 GLFW 环境，本文先用 GLEW 库取到显卡驱动中比 1.1 更新的 OpenGL 函数实现，并解决未定义 GLEW_STATIC 宏导致的「编译通过、链接失败」问题。随后从顶点缓冲区、DrawCall 与状态机谈起，介绍如何用 glVertexAttribPointer 向 OpenGL 描述顶点数据的内存布局，最后手写顶点着色器与片段着色器，编译链接成着色器程序，在窗口中绘制出第一个红色三角形。
typora-copy-images-to: OpenGL-入门学习（二）
typora-root-url: OpenGL-入门学习（二）
---

---
## 写在前面

上一篇博客 [OpenGL 入门学习（一）](https://littlefish04.github.io/blog/posts/3167167368/) 中配置的 GLFW 库让我们能够创建一个图形化窗口，同时也给我们初始化了 OpenGL 上下文，现在我们可以编写 OpenGL 代码在窗口中绘制图形了。

还有，笔者发现自己犯了个很严重的错误：视频教程里程序的目标平台设置的是 `x86`，但我一直用的是 `x64`，导致后面明明跟着视频步骤做却依然会出错，耗掉不少时间……明明上一篇博客里还专门提了下载 GLFW 时 32 位和 64 位的区别，怎么没注意到这个错误……

部分内容为ai生成，如有错误恳请指出。

---

## 一、使用现代 OpenGL

在上一篇博客里，GLFW 提供的示例代码中已经包含了一部分 OpenGL 代码。为了让它们顺利运行，我们在 `链接器 -> 输入 -> 附加依赖项` 里加入了 `opengl32.lib` 这个库。

`opengl32.lib` 是 Windows 平台提供的、用来链接 OpenGL 函数的系统库。不过 Windows 官方更推荐开发者使用 DirectX 图形 API，它对 OpenGL 的支持仅仅停留在 1.1 版本——这基本上是最早的 OpenGL 版本了，如果把难用的 1.0 版本排除在外的话。

要想用上比 1.1 更新的 OpenGL 版本，我们还得做点额外的工作。OpenGL 的函数实现写在 GPU 驱动里，理论上自己写代码去访问显卡驱动也能拿到这些函数，但一来这样的代码无法跨平台（在 Windows 上要用到 Win32 等接口，换一个平台又得换另一套接口），二来每个函数都要单独写一份加载代码，工作量太大了。

这正是 GLEW 库派上用场的地方：简单来说，它能直接帮我们取到显卡驱动里的 OpenGL 函数实现。

### 1.1 下载 GLEW 库

打开 [GLEW: The OpenGL Extension Wrangler Library](https://glew.sourceforge.net/)，下载预编译好的二进制文件。

![78600817482](1786008174827.png)

打开下载好的压缩包，里面有一个 `glew-2.x.x` 文件夹，把它复制到项目的 `Dependencies` 文件夹下。

![78600832817](1786008328171.png)

为了方便起见，可以把这个文件夹重命名为 `GLEW`。

### 1.2 在项目中配置 GLEW 库

#### 添加库依赖

和之前配置 GLFW 时一样，我们需要把 include 头文件目录和 lib 静态链接库目录加到项目配置里。

先打开项目的属性页，在 `C/C++ -> 常规 -> 附加包含目录` 里加上 `$(SolutionDir)Dependencies\GLEW\include`，注意与之前的目录之间用分号隔开。

![78600927753](1786009277530.png)

然后在 `链接器 -> 常规 -> 附加库目录` 里加上 `$(SolutionDir)Dependencies\GLEW\lib\Release\Win32`。如果你的程序目标平台是 `x64`，就把路径里的 `Win32` 换成 `x64`。

![78600947956](1786009479563.png)

可以看到这个目录下有两个 `.lib` 文件。其中 `glew32.lib` 是动态链接用的导入库，只有链接 `.dll` 文件时才用得上；`glew32s.lib` 才是真正的静态链接库。我们沿用之前的方案，只使用静态链接，所以只需要 `glew32s.lib` 这一个文件。

在 `链接器 -> 输入 -> 附加依赖项` 里加上 `glew32s.lib`。

![78600970310](1786009703107.png)

#### GLEW 官方文档

打开之前重命名好的 GLEW 文件夹。

![78600850292](1786008502920.png)

doc 文件夹里存放着 GLEW 库的官方文档，内容和官网上是一样的。

双击 `index.html` 可以打开文档的目录页，在本地查看这些文档。

在文档的 Usage 页面可以看到如何初始化 GLEW。

![78600889525](1786008895255.png)

文档的要求是：首先，你必须处在一个有效的 OpenGL 渲染上下文里，这一步之前配置的 GLFW 库已经帮我们做到了；然后，在通过 GLEW 调用任何 OpenGL 函数之前，需要先调用 `glewInit()` 函数。

#### 修改代码

在代码开头加上：

```cpp
#include <GL/glew.h>
#include <iostream>
```

**注意**：`glew.h` 一定要在其它 OpenGL 相关的头文件之前被包含，也就是说 `#include <GL/glew.h>` 这一行要放在 `#include <GLFW/glfw3.h>` 这一行上面，否则编译器会报错。

然后在合适的位置调用 `glewInit()`：

```cpp
    /* Make the window's context current */
    glfwMakeContextCurrent(window); // 这一句让窗口的 OpenGL 渲染上下文成为当前线程的上下文

    if (glewInit() != GLEW_OK) {
        std::cout << "Error!" << std::endl; // 根据文档，如果初始化成功就不会打印 Error!
    }
```

#### 添加宏

加上头文件以后，编辑器不再报错，看起来似乎一切正常。

但 Build 之后却依然会失败。简单来说，`glew.h` 里有一段逻辑：在未定义 `GLEW_STATIC` 宏时，它会从 `.dll` 动态库中导入函数。而我们并没有使用 GLEW 的动态库，自然无法从动态库文件里导入函数，所以链接阶段会报错。

现在我们把 `GLEW_STATIC` 宏的定义加上，这样 `glew.h` 就能正常地从静态库文件里导入函数了。

打开项目属性页，在 `C/C++ -> 预处理器 -> 预处理器定义` 里加上 `GLEW_STATIC`。

![78601139569](1786011395691.png)

现在再按 F5 运行一下，一切正常，也没有打印出 `Error!`，说明 GLEW 初始化成功了。

#### 验证 OpenGL 使用是否正常

现在我们有了一个有效的 OpenGL 上下文，可以访问到显卡驱动里各个版本的 OpenGL。让我们来打印一下 OpenGL 的版本号试试。

```cpp
    /* Make the window's context current */
    glfwMakeContextCurrent(window);

    if (glewInit() != GLEW_OK) {
        std::cout << "Error!" << std::endl;
    }

    std::cout << glGetString(GL_VERSION) << std::endl; // 新加的一行
```

现在按 F5 运行，应该能在控制台窗口中看到打印出的当前 OpenGL 版本号。

---

## 二、顶点缓冲区和绘制三角形

### 2.1 顶点缓冲区和着色器

现在我们需要用现代 OpenGL 来绘制一个三角形，在那之前先来了解一些概念。

**顶点缓冲区**（vertex buffer）就是一个缓冲区，一个内存字节数组。不过和 C 里字符数组那种位于内存（RAM）上的缓冲区不同，它是 OpenGL 的缓冲区，也就是说它位于 VRAM（显存）中。

**DrawCall**（绘制调用）是一条绘制指令，可以从显存中读取相应数据并绘制到屏幕上。

为了让我们这些运行在 CPU 上的 C 代码正确地指挥 GPU 读取和处理显存里的数据，我们需要**着色器**（shader）。着色器是一个运行在 GPU 上的程序，由我们编写的一堆在 GPU 上运行的代码组成。

OpenGL 是一个状态机。不要把它当成一个对象或者一堆属性和方法，实际上组成它的是不断切换、一个接着一个的状态。当我们用指令让它去绘制一个三角形时，并不是说在我们发出指令以后才把绘制三角形需要的数据传给它，而是这些数据（显存）早就已经是它状态的一部分。我们只是指挥它去选择我们需要的缓冲区和着色器，而这些选择将决定它绘制出什么样的三角形、绘制在哪里。

### 2.2 绘制三角形

现在我们来编写代码。

我们需要一个顶点缓冲区，里面放着三角形的数据。我们把数据塞到缓冲区里，把它发给 VRAM，然后发出一个 DrawCall 指令，指挥 OpenGL 用这些数据绘制一个三角形。

其中定义顶点缓冲区和放入数据的环节应该在 while 循环外完成，毕竟我们不需要每一帧都重复做一遍。

#### 定义顶点缓冲区

```cpp
unsigned int buffer;
glGenBuffers(1, &buffer);

/* Loop until the user closes the window */
while (!glfwWindowShouldClose(window))
...
```

我们使用 `glGenBuffers` 这个函数来定义顶点缓冲区。OpenGL 可以一次定义多个顶点缓冲区，这个函数的第一个参数就代表我们要定义的缓冲区数量；我们现在只需要一个顶点缓冲区，所以传入 1。

基本上我们在 OpenGL 里生成的所有东西——顶点缓冲区、纹理、着色器等等——都会被分配一个唯一的标识符，也就是一个数字 id。第二个参数表示这个顶点缓冲区的 id 会被放在哪里，需要我们传入一个指针（也就是内存中的地址），所以我们定义一个 `unsigned int buffer`，然后把它的地址传给函数。

现在顶点缓冲区已经创建好了，我们可以用 `buffer` 来访问它的 id。

#### 绑定顶点缓冲区

我们想要选择刚刚生成的这个顶点缓冲区来渲染图形，而在 OpenGL 中，这种选择被称作**绑定**（binding）。我们用 `glBindBuffer` 这个函数来绑定顶点缓冲区。

```cpp
unsigned int buffer;
glGenBuffers(1, &buffer);
glBindBuffer(GL_ARRAY_BUFFER, buffer); // 新加的一行
```

这个函数的第一个参数表示 target：你要用这个顶点缓冲区来做什么？我们现在只需要把它当做一个内存字节数组，一个普普通通的缓冲区，所以传入 `GL_ARRAY_BUFFER`。第二个参数则是缓冲区的 id，我们直接传入 `buffer` 就行。

#### 指定数据

有两种方法可以为顶点缓冲区指定数据。第一种是，你可以先指定它的大小，而不给出具体的数据，等到之后要用到的时候再更新缓冲区内的数据。

不过现在我们只是绘制一个简单的三角形，可以直接用第二种方法：给它提供数据。

```cpp
unsigned int buffer;
glGenBuffers(1, &buffer);
glBindBuffer(GL_ARRAY_BUFFER, buffer);

/* 新加的内容 */
float positions[6] = {
    -0.5f, -0.5f,
     0.0f,  0.5f,
     0.5f, -0.5f
};
glBufferData(GL_ARRAY_BUFFER, 6 * sizeof(float), positions, GL_STATIC_DRAW);

/* Loop until the user closes the window */
while (!glfwWindowShouldClose(window))
...
```

首先我们创建一个 float 数组存放顶点数据。一共有三个顶点，每个顶点都需要两个数来表示它的坐标。然后使用 `glBufferData` 这个函数来指定数据。

函数的第一个参数依然是 target，我们传入和之前一样的值；第二个参数指定要放入缓冲区的数据的大小（用字节数表示），我们传入 float 数组的大小，为了便于阅读我们不要直接传数字，而是使用 `6 * sizeof(float)`；第三个参数是一个指针，指向你要放进缓冲区里的数据，我们传入 `positions`（如果没有数据要放进缓冲区的话，这里就应该传入 `NULL`）；第四个参数是 usage，是对 GL 将如何访问缓冲区对象内存放的数据的一个提示。

usage 的取值由两部分组成。第一部分从 STREAM、STATIC、DYNAMIC 三者中挑选：其中 STREAM 不怎么常用，STATIC 用于只修改一次数据然后多次使用它的情况，DYNAMIC 用于反复修改和使用数据的情况。不过 usage 只是一个提示，就算你传入 STATIC 然后多次修改数据，代码照样能跑，只是运行速度会慢上许多。现在我们只需要放入顶点的数据，然后每帧读取数据来绘制三角形，不需要多次修改数据，所以我们选择 STATIC。第二部分可以从 DRAW、READ、COPY 中挑选，我们直接选 DRAW。所以最终传入的参数是 `GL_STATIC_DRAW`。

> 可以在 docs.gl 这个网站里方便地查阅 OpenGL 的文档。在里面输入函数的名字，比如 `glBufferData`，就可以看到关于这个函数各个参数的说明。

#### 让 OpenGL 知道数据的布局

现在我们还需要一个着色器来解释如何使用这些数据来进行绘制。不过下一章才会开始讲着色器，所以这里先跳过这一步，直接当作我们已经有了一个着色器，用代码开始画三角形。

现在我们已经把数据传给了 OpenGL，不过它们只是一个指针和一些字节。我们要怎么让 OpenGL 知道传入的数据其实是三个顶点呢？这可以用 `glVertexAttribPointer` 函数来实现，不过这个函数和着色器联系紧密，所以我们还是先跳过它。

#### 开始绘制

现在，假设我们已经做好了准备，OpenGL 已经知道数据怎么布局，就可以正式开始绘制三角形了。

我们要向顶点缓冲区发出一个 DrawCall 指令。这里可以使用 `glDrawArrays` 函数，这是在没有索引缓冲区（index buffer）时使用的函数。

```cpp
    /* Loop until the user closes the window */
    while (!glfwWindowShouldClose(window))
    {
        /* Render here */
        glClear(GL_COLOR_BUFFER_BIT);

        glDrawArrays(GL_TRIANGLES, 0, 3); // 新加的一行

        /* Swap front and back buffers */
        glfwSwapBuffers(window);

        /* Poll for and process events */
        glfwPollEvents();
    }
```

第一个参数是 mode，也就是指定你要画的图元。我们要画三角形，所以传入 `GL_TRIANGLES`。第二个参数指定数组的起始索引，我们要从第一个顶点开始画，所以传入 0。第三个参数指定你要渲染的索引（index）的数量，我们要渲染 3 个顶点，所以传入 3。

这就是一行 DrawCall 指令，也就是绘制三角形所需的代码。也许你会疑惑，光凭这么 3 个参数，OpenGL 就能知道怎么绘制三角形了吗？别忘了，OpenGL 是一个状态机：之前我们已经通过 `glBindBuffer` 给它绑定了缓冲区，并且往里面放入了对应的数据，它们都已经存在于 OpenGL 当前的状态里了。所以我们发出 DrawCall 指令以后，它就能从对应的缓冲区里找到需要的数据，并且按我们的期望把它绘制出来。

不过因为我们实际上还没有完成着色器的部分，现在运行这段代码还不能绘制出三角形，你应该只能看到一个黑屏窗口。实际上我们现在只完成了真正绘制三角形所需要的大概 30% 的内容……

---

## 三、顶点属性和内存布局

我们之前说过，虽然我们给 OpenGL 传了一些数据（通过显存上的顶点缓冲区），但这些数据对 OpenGL 来说还只是一堆字节。我们得让它知道，数据里存放的这些是 float，每个占 4 个字节；还得让它知道，每两个 float 代表一个顶点。之后在更复杂的例子里，我们可能还会往顶点的后面放上一些字节的其它数据，像是纹理坐标之类的，这些也都得让 OpenGL 知道。也就是说，我们要让 OpenGL 知道顶点缓冲区这块内存的布局。

### 3.1 如何表示内存布局

#### 顶点属性（vertex attribute）

顶点不只是一个位置，它实际上包含有很多属性，除了位置以外还有纹理坐标、法线、颜色等等。我们可以在顶点缓冲区里放入这些属性，然后用不同的索引（index）去引用它们，就像使用数组下标去引用元素一样。

#### glVertexAttribPointer 函数

首先让我们来看看 `glVertexAttribPointer` 这个函数。

这个函数每次可以指定一种顶点属性（对缓冲区里的所有顶点生效）。

![78971155250](1789711552501.png)

这个函数的第一个参数是 Index，就是顶点属性的索引。比方说我们把顶点的位置放在索引 0，把纹理坐标放在索引 1，颜色放在索引 2，如果现在要指定颜色这个顶点属性，那么就传入 2。

第二个参数是 size，也就是指明你现在要指定的这种顶点属性，每个属性要用多少个后面 `type` 参数指定的类型来表示。我们现在引用的是 2D 的顶点位置，每个位置用 2 个 float 表示，所以要传入 2。

第三个参数是 type，指定数据类型，我们直接传入 `GL_FLOAT`。

第四个参数是 normalized，有一些顶点属性在使用前需要先标准化。标准化的意思就是把一个更大区间内的数转换成一个绝对值在 $0 \sim 1$ 之间的小数。如果传入 `GL_TRUE` 就是需要标准化，如果传入 `GL_FALSE` 就是不需要标准化。我们现在的顶点已经是标准化的了，所以应该直接传入 `GL_FALSE`。

第五个参数是 stride，表示顶点的大小，或者说从当前顶点的起始位置跳到下一个顶点的起始位置需要经过多少字节。比方说我们现在有一种顶点，它包含位置（用 3 个 float 表示，12 字节）、纹理坐标（用 2 个 float 表示，8 字节）和法线（用 3 个 float 表示，12 字节）这 3 个顶点属性，一共是 32 字节，那么这个顶点的 stride 就是 32。

第六个参数是 pointer，表示你要指定的这个顶点属性相对这个顶点起始位置的偏移量。还是之前那个例子，一个顶点有位置、纹理坐标、法线这 3 个属性，其中位置的偏移量是 0，因为它就在顶点起始处；纹理坐标的偏移量是 12；法线的偏移量则是 20。

不过在实际使用中，我们一般不会传入 12、20 这样具体的数字，因为这不仅可读性差，而且一旦我们决定重新布局，就得全部重新计算修改一遍。我们更偏向于使用宏，也就是 C/C++ 标准库提供的 `offsetof`，可以用它来查出某个成员在结构体或类中的偏移量。

### 3.2 继续绘制三角形

现在回到我们的绘制三角形代码。在定义和绑定缓冲区以后，我们就可以开始指定内存布局了。我们的顶点只有位置这一个属性，所以只需要调用一次 `glVertexAttribPointer` 函数就可以了。

```cpp
unsigned int buffer;
glGenBuffers(1, &buffer);
glBindBuffer(GL_ARRAY_BUFFER, buffer);

float positions[6] = {
    -0.5f, -0.5f,
     0.0f,  0.5f,
     0.5f, -0.5f
};
glBufferData(GL_ARRAY_BUFFER, 6 * sizeof(float), positions, GL_STATIC_DRAW);

glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, sizeof(float) * 2, 0); // 新加的一行

/* Loop until the user closes the window */
while (!glfwWindowShouldClose(window))
...
```

在更复杂的例子里，我们不会用一个 float 数组来表示所有顶点，而是会用一个结构体来表示单个顶点，这样就可以方便地使用宏来表示顶点的大小和各个顶点属性的偏移量。另外注意一下 pointer 这个参数，尽管我们要传入的实际上就是一个数字，但这个参数的数据类型却是一个指针。我们现在传入的是 0，所以编译器不会报错；但假如偏移量是 0 以外的数字（像我们前面那个例子里的 12 和 20），就要用 `(const void*)` 强制类型转换了。

#### 启用顶点属性

最后我们还需要调用 `glEnableVertexAttribArray` 函数来启用顶点属性。还是一样的，这个函数每次可以启用一种顶点属性。

```cpp
glEnableVertexAttribArray(0); // 加在这里，或者加在 glVertexAttribPointer 后面也可以
glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, sizeof(float) * 2, 0);
```

这个函数只需要一个参数，就是你要启用的这个顶点属性的 index。

调用这个函数的时机可以在 `glVertexAttribPointer` 之前或者之后：OpenGL 只是一个状态机，它并不会在你启用顶点属性的时候去检查内存布局是不是已经分配好了，它只是像打开一个开关一样把对应索引设置为 enable。只要确保在绑定顶点缓冲区以后调用它就可以了。

现在再按 F5 运行程序，就有可能可以在窗口里看到一个三角形。

不过我们现在还没有提供任何着色器。之所以有些人的程序可以正确绘制出三角形，是因为他们使用的显卡驱动提供了默认的着色器——这并不是所有驱动都会提供的功能，所以另一些人运行后看到的仍然只是一个黑屏窗口。显然我们不该依赖这样的默认着色器，所以接下来我们应该写一个自己的着色器。

---

## 四、着色器原理

### 4.1 什么是着色器

正如我们之前所说，**着色器**（shader）是一段运行在 GPU 上的代码。你可以像 C 代码一样去编译、链接、运行它，就像我们通常运行一个程序那样，只不过着色器这个程序并非运行在 CPU 上，而是运行在 GPU、在我们的显卡上。

为什么我们会想要在 GPU 上运行程序？因为我们要处理图形，而在处理图形相关的大部分问题上，GPU 的处理速度要比 CPU 快得多得多。所以我们需要借助着色器来让 GPU 为我们处理这些问题。不过尽管如此，还是有一些工作在 CPU 上运行会更快，这时候我们会选择在 CPU 上运行程序，然后将处理好的结果数据发给 GPU。

除了速度问题，为了在屏幕上显示图形，我们也必须告诉 GPU 应该怎么做。顶点在什么位置、三角形要怎么画，所有这些都需要被编程，需要由着色器告诉 GPU 如何处理这些数据。

对于大多数 OpenGL 学习，甚至是对于大多数图形编程，我们都会把重点放在两种着色器上：**顶点着色器**（vertex shader）和**片段着色器**（fragment shader），其中片段着色器也被称作**像素着色器**（pixel shader）。当然还有许多其它的着色器，不过我们大部分情况下还是在和上述两种着色器打交道。

### 4.2 渲染管线和两种着色器

OpenGL 的渲染管线，或者说标准的图形渲染管线，大致是这样工作的：我们在 CPU 上写了一堆数据，把其中一些数据发给 GPU，在发出 DrawCall 指令之前绑定一些状态，然后发出 DrawCall 指令，最后就到了着色器的阶段——也就是 GPU 处理 DrawCall 指令并且在屏幕上绘制东西的阶段——于是我们就看到一个三角形被绘制在了屏幕上。从数据到屏幕上图形的这整个过程，就叫做渲染管线。

顶点着色器和片段着色器是两种不同的着色器类型，在渲染管线中依次被使用。当我们发出 DrawCall 指令后，它会调用顶点着色器，接着调用片段着色器，最后我们就能在屏幕上看到处理好的像素。当然这中间还有很多复杂的阶段，但我们先跳过它们。

渲染管线会为我们试图渲染的每个顶点调用顶点着色器。在绘制三角形的例子里，有 3 个顶点要渲染，所以顶点着色器会被调用 3 次。顶点着色器的主要目的是，告诉 OpenGL 这些顶点应该处在屏幕空间（在我们的例子中就是那个窗口）里的什么位置；除此之外，它还需要把数据从顶点属性转换成下一个阶段可以使用的类型。

然后进入下一个阶段，也就是调用片段着色器。渲染管线会为每一个需要被光栅化的像素调用片段着色器。其中光栅化的意思，简单来说就是把像素画在屏幕上——就像现在我们要绘制一个三角形，已经知道了 3 个顶点的位置，光栅化所要做的就是把这个三角形内部用实际的像素填充起来，这样一来三角形就可以显示在屏幕上。片段着色器的作用则是决定每一个像素应该是什么颜色。

#### 优化和性能

注意到在绘制我们的三角形时，顶点着色器只调用了 3 次，但片段着色器却可能被调用上千甚至上万次，具体取决于三角形的大小。假如说我们要在顶点着色器里做一个计算（比如 $5 \ast 5$），那么这个计算会被执行 3 次；如果我们在片段着色器里做这个计算，那么它将会被计算上千上万次。很显然，当考虑优化和性能的时候——也就是说要尽量减少代码运行的时间——我们会希望把一些关键计算放在顶点着色器里完成，再把数据从顶点着色器传到片段着色器。

要记住这一点：在片段着色器里所做的任何计算都是非常昂贵的，所以我们应该尽量减少片段着色器里的计算。话虽如此，有时候有些计算是必须对每个像素执行的，那么我们就不可避免地要把它放在片段着色器中。

---

## 五、编写一个着色器

### 5.1 创建着色器程序

#### 函数定义

首先让我们定义一个函数。为了防止干扰其它 C 文件和翻译单元，我们把它声明为静态。

```cpp
static unsigned int CreateShader(const std::string& vertexShader, const std::string& fragmentShader) {}
// 在 main 函数之前声明
```

> `static` 修饰函数时，改变的是**链接可见性**。普通全局函数可以被其他源文件链接调用；static 全局函数只能在本源文件/翻译单元内使用。

函数的两个参数分别会接受两个字符串，作为顶点着色器和片段着色器的源码。一般来说我们会从文件里读取着色器的源码，不过这只是个简单的例子，为了方便我们选择直接传入字符串源码。

这个函数主要要做的是：把两个着色器的源码提供给 OpenGL，让 OpenGL 编译并链接它们，得到一个独立的着色器程序，然后返回给我们一个表示这个程序的唯一标识符。之后我们就可以绑定这个标识符并使用这个着色器，就像我们之前在顶点缓冲区那里做的一样。

#### 创建程序

接下来我们开始编写这个函数的内容。

首先让我们创建一个程序。我们使用 `glCreateProgram` 这个函数来创建程序并得到它的标识符。不过和 `glGenBuffers` 不同，我们不需要传入一个指针来接受这个标识符，而是由函数直接返回一个无符号整型。OpenGL 的 API 就是这么毫无规律。

```cpp
unsigned int program = glCreateProgram();
```

#### 编译着色器对象

实际上编译两个着色器所需的代码有很多重复之处，所以我们用一个函数来编译着色器，这样就可以调用它两遍，而不是写两遍重复的代码。

我们来定义一个新函数：

```cpp
static unsigned int CompileShader(unsigned int type, const std::string& source) 
{}
// 在 CreateShader 函数之前声明
```

第一个参数传入我们要编译的着色器的类型（使用 OpenGL 定义好的宏），第二个参数传入这个着色器的源码。

还是一样，我们先创建一个着色器，并得到这个着色器的唯一标识符：

```cpp
unsigned int id = glCreateShader(type);
```

接下来，因为 OpenGL 里编译着色器的函数不接受 C++ 的 `string` 类作为参数，而是使用原始的字符数组，所以我们要做一点小转换：

```cpp
const char* src = source.c_str();
```

注意 `c_str` 这个函数返回的是指针常量，所以我们要用 `const char*` 来接收它。

> 关于 `c_str` 的易错用法：这个函数并不会复制或者创建一个新字符串，而是返回一个直接指向 `string` 对象内部数据的指针。也就是说，假如 `source` 的生命周期结束后我们还持有 `src` 这个指针，它将指向一块垃圾内存，也就是变成一个悬空指针。所以如果我们要使用 `src`，一定要确保 `source` 还没有失效。

接下来我们指定着色器的源码：

```cpp
glShaderSource(id, 1, &src, nullptr);
```

`glShaderSource` 这个函数接受四个参数：第一个是着色器标识符；第二个是源码的数量；第三个是指向字符数组的指针（一个二级指针）；第四个则是 length，指定要读取的源码长度。比较有意思的是，如果我们给 length 传入 `nullptr`，这并不表示长度为 0，而是让函数以字符串自身的结束符（`\0`）来判断要读取多少内容。

最后我们编译着色器，直接传入着色器 id 就行了：

```cpp
glCompileShader(id);
```

别忘了函数还需要返回着色器的标识符，一个无符号整数。

于是这就是 `CompileShader` 函数的完整代码：

```cpp
static unsigned int CompileShader(unsigned int type, const std::string& source) {
    unsigned int id = glCreateShader(type);
    const char* src = source.c_str();
    glShaderSource(id, 1, &src, nullptr);
    glCompileShader(id);
    return id;
}
```

#### 编译错误处理

不过现在这个函数还缺少一些关键的错误处理代码，像是如果 `source` 里少写了一个分号它应该怎么处理。可以看到 `glCompileShader` 函数并没有返回值，它不会返回编译的结果。为了获取到编译结果，我们需要调用 `glGetShaderiv`：

```cpp
static unsigned int CompileShader(unsigned int type, const std::string& source) {
    unsigned int id = glCreateShader(type);
    const char* src = source.c_str();
    glShaderSource(id, 1, &src, nullptr);
    glCompileShader(id);

    /* 新加的部分 */
    int result;
    glGetShaderiv(id, GL_COMPILE_STATUS, &result);
    if (result == GL_FALSE) {
        int length;
        glGetShaderiv(id, GL_INFO_LOG_LENGTH, &length);
        char* message = (char*)alloca(length * sizeof(char));
        glGetShaderInfoLog(id, length, &length, message);
        std::cout << "Failed to compile " << (type == GL_VERTEX_SHADER ? "vertex" : "fragment") << " shader!" << std::endl;
        std::cout << message << std::endl;
        glDeleteShader(id);
        return 0;
    }

    return id;
}
```

`glGetShaderiv` 函数接受三个参数：第一个是着色器 id，第二个是一个决定这个函数会输出什么结果的宏，第三个则是个用于存放函数输出结果的地址。

我们看到第一次调用 `glGetShaderiv` 函数得到一个结果，表示编译是否成功。如果不成功的话则会进入错误处理：我们会再次调用这个函数，传入一个不同的宏来得到编译错误消息的长度。接着我们需要一个字符数组来存储错误消息，但是 C++ 并不允许我们使用 `char message[length]` 这样的方法来创建一个长度为 `length` 的字符数组，因为 `length` 是一个变量，而 C++ 有时候就是会莫名其妙地阻止人用变量声明数组长度。所以我们只好使用 `alloca` 函数，它允许我们在栈上动态分配内存，于是我们终于得以声明出一个长度为 `length` 的字符数组。接下来使用 `glGetShaderInfoLog` 函数来获取具体的编译错误消息，我们看到它接收了一个 `length` 参数，然后又接收了一个指向 `length` 的指针作为参数，我们也不知道这是为了什么。接着我们打印出错误信息，然后当然了，因为编译失败了，我们得把编译出来的垃圾清理掉，于是调用 `glDeleteShader(id)`。最后用 `return 0` 结束这个函数。

> 你们真的应该去看看原视频的这一 P，视频作者讲的 OpenGL 和 C++ 笑话非常好笑，因为它们都有着超越喜剧效果的令人喜爱的好用 API。

#### 链接

现在回到我们的 `CreateShader` 函数，调用我们的编译着色器方法：

```cpp
unsigned int vs = CompileShader(GL_VERTEX_SHADER, vertexShader);
unsigned int fs = CompileShader(GL_FRAGMENT_SHADER, fragmentShader);
```

调用 `glAttachShader` 函数把着色器附着到程序上：

```cpp
glAttachShader(program, vs);
glAttachShader(program, fs);
```

这个函数的第一个参数是程序的标识符，第二个参数是着色器的标识符。我们有两个着色器，所以要附着两次。

接着调用 `glLinkProgram` 链接程序，该函数只接收程序标识符这一个参数：

```cpp
glLinkProgram(program);
```

#### 验证、清理和返回

使用 `glValidateProgram` 函数验证程序：

```cpp
glValidateProgram(program);
```

现在着色器已经被链接到程序上了，我们不再需要这些编译出来的中间产物，让我们把它们删掉：

```cpp
glDeleteShader(vs);
glDeleteShader(fs);
```

最后让我们的函数返回程序的标识符：

```cpp
return program;
```

完成了！下面是 `CreateShader` 函数的完整代码：

```cpp
static unsigned int CreateShader(const std::string& vertexShader, const std::string& fragmentShader) {
    unsigned int program = glCreateProgram();
    unsigned int vs = CompileShader(GL_VERTEX_SHADER, vertexShader);
    unsigned int fs = CompileShader(GL_FRAGMENT_SHADER, fragmentShader);

    glAttachShader(program, vs);
    glAttachShader(program, fs);
    glLinkProgram(program);
    glValidateProgram(program);

    glDeleteShader(vs);
    glDeleteShader(fs);

    return program;
}
```

### 5.2 编写着色器

接下来我们来写着色器源码。着色器源码，以及之后创建和绑定着色器程序的代码，都可以放在指定顶点属性之后、while 循环之前的位置。

我们需要写两个字符串。注意为了让代码能正确运行，在每一行末尾都要写换行符。另外，C++ 会自动连接这些字符串字面量，所以不用在中间加上 `+` 也可以。

#### 编写顶点着色器

```cpp
std::string vertexShader =
    "#version 330 core\n"
    "\n"
    "layout(location = 0) in vec4 position;\n"
    "\n"
    "void main()\n"
    "{\n"
    "   gl_Position = position;\n"
    "}\n";
```

这是一个非常简单的顶点着色器。它把顶点的位置设置为我们之前放在顶点缓冲区里的坐标。

第 2 行表明我们使用的是 OpenGL 着色语言（OpenGL Shading Language，简称 GLSL）的 330 版本，其中的 `core` 表示核心模式（core profile），也就是只使用该版本的核心功能，不包含那些已被废弃的兼容性特性。

第 4 行是 GLSL 特有的语法，它表示从顶点缓冲区里拿出索引为 0 的顶点属性，放到一个 `vec4` 类型的变量 `position` 里。`vec4` 就是四维向量，虽然我们放在顶点属性里的实际上只是二维向量（用两个值表示的顶点位置），不过由于我们之前指定顶点属性时传入的参数是 2，所以 OpenGL 也知道这是个二维向量，于是它会自动且正确地把 `vec2(x, y)` 转换成 `vec4(x, y, 0, 1)`——缺少的分量会被自动补成 0 和 1。

接下来是正常的 `main` 函数声明。第 8 行把 `gl_Position` 设置为 `position`，就是在设置顶点位置了。注意 `gl_Position` 的类型是 `vec4`，所以赋给它的值也应该是 `vec4`，这也是为什么我们之前把 `position` 声明成 `vec4`。

#### 编写片段着色器

```cpp
std::string fragmentShader =
    "#version 330 core\n"
    "\n"
    "layout(location = 0) out vec4 color;\n"
    "\n"
    "void main()\n"
    "{\n"
    "   color = vec4(1.0, 0.0, 0.0, 1.0);\n"
    "}\n";
```

我们把顶点着色器的代码改一改就得到片段着色器了。

第 4 行表示我们要输出一个颜色值 `color`。第 8 行则是把 `color` 设置成红色，这里使用的是标准化的 RGBA 表示法，四个值分别代表红、绿、蓝、不透明度。

这段代码意味着我们渲染出的三角形应该是红色的。

#### 使用着色器和绑定程序

最后我们调用之前写好的 `CreateShader`，传入我们写的着色器源码，得到着色器程序的标识符，然后绑定着色器：

```cpp
unsigned int shader = CreateShader(vertexShader, fragmentShader);
glUseProgram(shader);
```

其中 `glUseProgram` 用于绑定（启用）这个着色器程序，之后的 DrawCall 就会使用它来绘制。

现在按 F5 运行，应该能看到红色的三角形被渲染在屏幕上了。

#### 清理

最后别忘了在 while 循环后面加上这个：

```cpp
glDeleteBuffers(1, &buffer);
glDeleteProgram(shader);
```

把我们创建的顶点缓冲区和着色器程序清理掉。

---

## 参考资料

- [【双语】【TheCherno】OpenGL_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1Ni4y1o7Au/?spm_id_from=333.337.search-card.all.click&vd_source=b620703bd4c9a236a25ac8bf0c1f6f5c)
