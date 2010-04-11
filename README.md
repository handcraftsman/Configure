## Description

Configure is a build environment bootstrapping tool that determines what the user wants to build and whether it is possible with the available tools. If the necessary infrastructure exists or can be added by Configure a build file for the project will be created. 

## Motivation

As a tool developer you may find that you include infrastructural tools (NUnit console, RakeFile, WatiN runner, etc) in your projects over and over in order to compile your project from the command line. If you could make use of whatever is already on the receiving system downloads could be a lot smaller.

As a tool user you may find that open source projects are not compile-ready when downloaded. Critical files and/or libraries may be missing from the source code. There may be no build script or the provided build script may require a tool that you don't have or have never used (like ruby or powershell) requiring you to hunt down and/or install necessary infrastructure in order to get the project to compile and run.

The intent of this project is to automagically deduce the build requirements from the files in the project directory and create the necessary build infrastructure if possible. This allows you to concentrate on the code rather than the build environment.

## Methodology

Configure examines 

1) the available build and compile tools (such as Ruby, MSBuild, etc), and 
2) the source code under the directory that contains it

in order to create the necessary ecosystem to build the project. Preference will be given to tools such as Ruby and Perl that have the ability to automatically download and install standard modules that can be used in the build infrastructure.

The goal is a tool that

1) can run on any Windows system from a command prompt or double clicked file
2) uses a non-compiled format that can be examined by those concerned with security
3) has a small footprint in the target source tree (a single boostrap file)
4) can rebuild its own ecosystem if pieces are removed
5) is easy for interested parties to expand to support new tools and environments

With those goals in mind, Configure is written in JScript because

1) its execution engine (CScript) has come with all Windows versions since Windows 98 (goals 1 and 2)
2) it has access to a broad range of components built into Windows (goals 3 and 4)
3) it is a C-like language (goal 5)

## Quickstart

Simply include the bootstrap script file (configure.bat) in your project and add instructions in your README for developers to run it to create the necessary build ecosystem on their system if possible.

### Test it

Run configure.bat on your project to make sure it works for you then run the resulting build.bat to make sure it can compile your code. 

If you find a bug or Configure does not currently support your project type/tool set please add that capability and send a patch or a pull request.

## License

[MIT License][mitlicense]

[mitlicense]: http://www.opensource.org/licenses/mit-license.php