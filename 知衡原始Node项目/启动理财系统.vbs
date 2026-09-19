Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strParent = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strParent

' Check if port 3000 is occupied
Set oExec = WshShell.Exec("cmd /c netstat -ano")
strOut = oExec.StdOut.ReadAll()

If InStr(strOut, ":3000 ") = 0 Then
    ' 0 means hidden window
    WshShell.Run "cmd /c node server.js", 0, False
    WScript.Sleep 2000
End If

' Open default browser safely
WshShell.Run "cmd /c start http://localhost:3000", 0, False
