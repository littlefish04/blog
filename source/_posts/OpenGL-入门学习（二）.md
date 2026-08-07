---
title: OpenGL 入门学习（二）
tags:
  - 图形学基础
  - OpenGL
categories: OpenGL 学习
toc: true
abbrlink: 2362560336
date: 2026-08-06 15:55:15
summary: 施工中(已鸽)
description:
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

在上一篇博客里，GLFW 提供的示例代码中已经包含了一些 OpenGL 代码。为了让代码顺利运行，我们在 `链接器 -> 输入 -> 附加依赖项` 里加入了 `opengl32.lib` 这个库。

`opengl32.lib` 是 Windows 平台提供的、用来链接 OpenGL 函数的系统库。不过 Windows 官方推荐开发者使用 DirectX 图形 API，对 OpenGL 的支持则仅仅停留在 1.1 版本——这基本上是最早的 OpenGL 版本了，如果排除掉难用的 1.0 版本的话。

要想用上比 1.1 更新的 OpenGL 版本，我们还得做点什么。当然，OpenGL 的函数实现是写在 GPU 里的，理论上自己写代码去访问显卡驱动也能取到这些函数实现，但一来这样的代码没法跨平台（在 Windows 上要用到 Win32 等接口，换一个平台又要换另一套接口），二来每个函数都要单独写一份代码，工作量太大了。

这就是 GLEW 库派上用场的地方了。简单来说，它能直接帮我们取到显卡驱动里的 OpenGL 函数实现代码。

### 1.1 下载 GLEW 库

打开 [GLEW: The OpenGL Extension Wrangler Library](https://glew.sourceforge.net/)，下载预编译好的二进制文件。

![78600817482](1786008174827.png)

打开下载好的压缩包，里面有个 `glew-2.x.x` 文件夹，把它复制到项目的 Dependencies 文件夹下。

![78600832817](1786008328171.png)

方便起见，可以把这个文件夹重命名为 `GLEW`。

### 1.2 在项目中配置 GLEW 库 

#### 添加库依赖

和之前配置 GLFW 时一样，我们要把 include 头文件目录和 lib 静态链接库目录加到项目配置里。

先打开项目的属性页，然后在 `C/C++ -> 常规 -> 附加包含目录` 里加上 `$(SolutionDir)Dependencies\GLEW\include`，注意与之前的目录之间用分号隔开。

![78600927753](1786009277530.png)

然后在 `链接器 -> 常规 -> 附加库目录` 里加上 `$(SolutionDir)Dependencies\GLEW\lib\Release\Win32`。如果你的程序目标平台是 `x64`，就把 `Win32` 换成 `x64`。

![78600947956](1786009479563.png)

可以看到这个目录下有两个 `.lib` 文件。其中 `glew32.lib` 是动态链接用的导入库，链接 `.dll` 文件时才用得上；`glew32s.lib` 才是真正的静态链接库。我们沿用之前的方案，只使用静态链接，所以只需要 `glew32s.lib` 这一个文件。

在 `链接器 -> 输入 -> 附加依赖项` 里加上 `glew32s.lib`。

![78600970310](1786009703107.png)

#### GLEW 官方文档

打开之前重命名的 GLEW 文件夹。

![78600850292](1786008502920.png)

里面存放了 GLEW 库的官方文档，内容和官网上是一样的。

双击 `index.html` 可以打开文档的目录页，在本地查看这些文档。

在文档的 Usage 页面可以看到如何初始化 GLEW。

![78600889525](1786008895255.png)

文档要求：首先，你必须处在一个有效的 OpenGL 渲染上下文里，这一步之前配置的 GLFW 库已经为我们做到了；然后，在通过 GLEW 调用任何 OpenGL 函数之前，需要先调用 `glewInit()` 函数。

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

现在编译器没有报错了，看起来似乎一切正常。

但 Build 之后却报错了。简单来说，`glew.h` 的代码中有一段逻辑：在未定义 `GLEW_STATIC` 宏时，它会从 `.dll` 动态库中导入函数。而我们并没有使用 GLEW 的动态库，也不可能从动态库文件里导入函数，所以链接会失败报错。

现在我们把 `GLEW_STATIC` 宏的定义加上，这样 `glew.h` 就能正常从静态库文件里导入函数了。

打开项目属性页，在 `C/C++ -> 预处理器 -> 预处理器定义` 里加上 `GLEW_STATIC`。

![78601139569](1786011395691.png)

现在再按 F5 运行一下，一切正常，也没有打印 "Error!"，说明 GLEW 初始化成功了。

#### 验证 OpenGL 使用是否正常

现在我们有了一个有效的 OpenGL 上下文，可以访问到显卡驱动里的各个版本的 OpenGL。让我们来打印一下 OpenGL 的版本号试试。

```cpp
    /* Make the window's context current */
    glfwMakeContextCurrent(window);

    if (glewInit() != GLEW_OK) {
        std::cout << "Error!" << std::endl;
    }

    std::cout << glGetString(GL_VERSION) << std::endl; // 新加的一行
```

现在按 F5 运行，应该能在运行窗口上看到打印出的当前 OpenGL 版本号。

---

## 二、顶点缓冲区和绘制三角形

### 2.1 什么是顶点缓冲区

施工中

准备去仔细学一学 CSAPP 了，这篇先鸽一鸽

---

## 参考资料

- [【双语】【TheCherno】OpenGL_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1Ni4y1o7Au/?spm_id_from=333.337.search-card.all.click&vd_source=b620703bd4c9a236a25ac8bf0c1f6f5c)