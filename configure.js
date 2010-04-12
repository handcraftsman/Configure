// project: Configure http://github.com/handcraftsman/Configure
// author: Copyright (c) 2010 Clinton Sheppard <gar3ts@gmail.com>
// license: MIT License http://creativecommons.org/licenses/MIT/

// -------- constants

var configureRawFileUrl = "http://github.com/handcraftsman/Configure/raw/master/";
var buildSupportDirName = "build_support";
var rubyBuildUtilsFile = "BuildUtils.rb";
var rubyBuildUtilsUrl = configureRawFileUrl+rubyBuildUtilsFile;
var rubyRakeFile = "RakeFile";
var rubyRakeFileUrl = configureRawFileUrl+rubyRakeFile;

// -------- program level variables
// objects
var fso = WScript.CreateObject("Scripting.FileSystemObject");

// project/solution file
var sln = "";
var scriptPath = "";

// build and test tools
var csc = "";
var msbuild = "";
var nant = "";
var nunit = "";
var powershell = "";
var ruby = "";
var rubygem = "";
var rubyrake= "";

// -------- main
Main();

function Main()
{
	scriptPath = WScript.ScriptFullName;
	scriptPath = scriptPath.substr(0, 1 + scriptPath.lastIndexOf("\\"));
	WScript.StdOut.WriteLine("script path: "+scriptPath);
	
	try
	{
		Scan();
		var result = Configure();
		WScript.quit(result);
	}
	catch(error)
	{
		WScript.StdOut.WriteLine("caught error: "+error.description);
		WScript.quit(1);
	}
}

// -------- functions, alphabetically

function CheckFor(toolName, toolExe, versionRequest)
{
	WScript.StdOut.Write("checking for "+toolName+"... ");
	var toolInfo = CheckInPath(toolName, toolExe, versionRequest);
	if (toolInfo.Path != "")
	{
		WScript.StdOut.WriteLine("yes "+toolInfo.Version);
		return toolInfo;
	}
	toolInfo = CheckInSubdirectory(toolName, toolExe, versionRequest);
	if (toolInfo.Path != "")
	{
		WScript.StdOut.WriteLine("yes "+toolInfo.Version+" location "+toolInfo.Path);
		toolInfo.InSubdirectory = true;
		return toolInfo;
	}
	
	WScript.StdOut.WriteLine("no");
	return toolInfo;
}

function CheckForCsc()
{
	csc = CheckFor("csc","%WinDir%\\Microsoft.NET\\Framework\\v2.0.50727\\csc.exe","/help");
}

function CheckForMsbuild()
{
	msbuild = CheckFor("MSBuild","%WinDir%\\Microsoft.NET\\Framework\\v2.0.50727\\msbuild.exe","/nologo /ver");
}

function CheckForNant()
{
	nant = CheckFor("NAnt","nant.exe","--version");
}

function CheckForNunit()
{
	nunit = CheckFor("NUnit","nunit-console-x86.exe","/version");
}

function CheckForPowershell()
{
	powershell = CheckFor("PowerShell","powershell.exe","-noninteractive $host.version.tostring()");
}

function CheckForRuby()
{
	ruby = CheckFor("Ruby","ruby.exe","--version");
	if (ruby != "")
	{
		CheckForRubyGem();
		CheckForRubyRake();
	}
}

function CheckForRubyGem()
{
	rubygem = CheckFor("Ruby Gem","gem.bat","--version");
}

function CheckForRubyRake()
{
	rubyrake = CheckFor("Ruby Rake","rake.bat","--version");
}

function CheckForSolutionFile()
{
	WScript.StdOut.Write("checking for sln... ");
	var path = SearchSubdirectoryForFile(".sln$");
	if (path != "")
	{
		path = GetRelativePath(path);
		WScript.StdOut.WriteLine("yes "+path);
		return path;
	}
	WScript.StdOut.WriteLine("no");
	return "";
}

function CheckInPath(toolName, toolExe, versionRequest)
{
	var result = new Object();
	result.Path = "";
	result.Version = "";
	result.InSubdirectory = false;

	try
	{
		var shell = Shell().exec(toolExe+" "+versionRequest);
		if (shell.Status == 0)
		{
			shell.StdIn.Close()
			var output = shell.StdOut.ReadLine();
			var version = output.replace(/^\s+/g, '').replace(/\s+$/g, '');
			result.Version = version;
			result.Path = toolExe;
			return result;
		}
	}
	catch(error)
	{
	}
	return result;
}

function CheckInSubdirectory(toolName, toolExe, versionRequest)
{
	var result = new Object();
	result.Path = "";
	result.Version = "";
	try
	{
		result.Path = SearchSubdirectoryForFile(toolExe);
		if (result.Path != "")
		{
			return CheckInPath(toolName, GetRelativePath(result.Path), versionRequest);
		}
	}
	catch(error)
	{
		WScript.Echo("error: "+error.description);
	}
	return result;

}

function Configure()
{
	WScript.StdOut.WriteLine("");
	WScript.StdOut.WriteLine("configuring...");

	if (sln == "")
	{
		WScript.StdOut.WriteLine("solution file not found... cannot continue.");
		return 1;
	}
	
	if (ruby.Path != "")
	{
		return ConfigureRuby();
	}
	else
	{
		WScript.StdOut.WriteLine("Ruby not found... Configure currently only supports building with Ruby. Please submit a patch. Cannot continue.");
		return 1;
	}
	
	return 0;
}

function ConfigureRuby()
{
	WScript.StdOut.WriteLine("configuring for Ruby ...");
	var result = EnsureRubyBuildEcosystem();
	if (result != 0)
	{
		return result;
	}
	
	if (msbuild.Path == "")
	{
		WScript.StdOut.WriteLine("MSBuild not found... Configure currently only supports compilation with MSBuild. Please submit a patch. Cannot continue.");
		return 1;
	}

	result = EnsureRubyRakeFileExists();
	if (result != 0)
	{
		return result;
	}

	return CreateRubyBuildFile();
}

function CreateRubyBuildFile()
{
	var ForWriting= 2;
	var AsAscii = 0;
	var file = fso.OpenTextFile(scriptPath+"Build.bat", ForWriting, true, AsAscii);
	file.WriteLine("@ECHO OFF");
	file.WriteLine("set params=%*");
	file.WriteLine("IF (%1) == () set params=default");
	file.WriteLine(rubyrake.Path+" %params% \""+sln+"\"");
	file.Close();
}

function DownloadFile(url, filePath)
{
	WScript.StdOut.Write("downloading "+url+" to "+filePath+"... ");
	try
	{
		var parameters = "\""+url+"\" \""+scriptPath+filePath+"\"";
		var result = ExecuteScript("cscript //NoLogo downloadFile.js",parameters);
		if (result.status == 0)
		{
			WScript.StdOut.WriteLine("OK "+result.output);
			return 0;
		}
		WScript.StdOut.WriteLine("failed -- "+result.output);
		return 1;
	}
	catch(error)
	{
		WScript.StdOut.WriteLine("failed -- "+error.description);
		return 1;
	}
	
	WScript.StdOut.WriteLine("failed");
	return 1;
}

function EnsureBuildSupportDirectoryExists()
{
	if (fso.FolderExists(buildSupportDirName))
	{
		return 0;
	}
	
	WScript.StdOut.Write("creating "+buildSupportDirName+"... ");
	try
	{
		var a = fso.CreateFolder(buildSupportDirName);
		WScript.StdOut.WriteLine("OK");
		return 0;
	}
	catch(error)
	{
		WScript.StdOut.WriteLine("failed -- "+error.description);
		return 1;
	}
}

function EnsureRubyBuildEcosystem()
{
	WScript.StdOut.WriteLine("ensuring Ruby build ecosystem...");
	var result = EnsureRubyRakeExists();
	if (result != 0)
	{
		return result;
	}
	result = EnsureBuildSupportDirectoryExists();
	if (result != 0)
	{
		return result;
	}
	result = EnsureRubyBuildUtilsExist();
	if (result != 0)
	{
		return result;
	}
	return 0;
}

function EnsureRubyBuildUtilsExist()
{
	var file = buildSupportDirName+"\\"+rubyBuildUtilsFile;
	if (fso.FileExists(file))
	{
		return 0;
	}
	return DownloadFile(rubyBuildUtilsUrl,file);
}

function EnsureRubyRakeExists()
{
	if (rubyrake.Path != "")
	{
		return 0;
	}
	
	WScript.StdOut.Write("installing Rake...");
	var result = ExecuteScript("gem.bat install --remote rake");
	if (result.status == 0)
	{
		WScript.StdOut.WriteLine("succeeded");
		CheckForRubyRake();
		return 0;
	}
	WScript.StdOut.WriteLine("failed -- "+result.output);
	return 1;
}

function EnsureRubyRakeFileExists()
{
	if (fso.FileExists(rubyRakeFile))
	{
		return 0;
	}
	return DownloadFile(rubyRakeFileUrl,rubyRakeFile);
}


function ExecuteScript(scriptPath, scriptParameters)
{
	var result = new Object();
	result.status = 1;
	result.output = "";
	try
	{
		var commandLine = scriptPath+" "+scriptParameters;
		//WScript.StdOut.WriteLine("executing: "+commandLine);

		var shell = Shell().exec(commandLine);
		shell.StdIn.Close()
		result.output == shell.StdOut.ReadAll();
		result.status = shell.status;
		return result;
	}
	catch(error)
	{
		return result;
	}
}

function GetRelativePath(absolutePath)
{
	var path = absolutePath.substr(scriptPath.length, absolutePath.length);
	return path;
}

function Include(jsFile) 
{
    f = fso.OpenTextFile(jsFile);
    s = f.ReadAll();
    f.Close();
    return s;
}

function Scan()
{
	WScript.StdOut.WriteLine("scanning...");

	// project/solution
	sln = CheckForSolutionFile();
	
	// build & compile tools (alphabetical)
	CheckForCsc();
	CheckForMsbuild();
	CheckForNant();
	CheckForNunit();
	CheckForPowershell();
	CheckForRuby();
}

function SearchFilesForFile(items, fileName) 
{
    var e = new Enumerator(items);
    while (! e.atEnd()) 
	{
        var file = e.item();
        if (file.name.match(fileName) != null)
		{
            return file.path;
		}
        e.moveNext();
    }
	return "";
}

function SearchDirectoryForFile(dir, fileName) 
{
    var result = SearchFilesForFile(dir.Files, fileName);
	if (result != "")
	{
		return result;
	}
    var e = new Enumerator(dir.Subfolders);
    while (! e.atEnd()) 
	{
        var subdir = e.item();
		if (subdir.name != ".git" && 
			subdir.name != ".svn")
		{
			var result = SearchDirectoryForFile(subdir, fileName);
			if (result != "")
			{
				return result;
			}
		}
        e.moveNext();
	}
	return "";
}

function SearchSubdirectoryForFile(fileName)
{
	var dir = fso.GetFolder(".");
	return SearchDirectoryForFile(dir, fileName);
}

function Shell()
{
	return WScript.CreateObject("WSCript.shell")
}
