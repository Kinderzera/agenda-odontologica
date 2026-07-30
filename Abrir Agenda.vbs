Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strPasta = objFSO.GetParentFolderName(WScript.ScriptFullName)
strNode = objShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\node-portable\node.exe"

' Sobe o servidor em segundo plano, sem abrir janela de terminal
objShell.Run "cmd /c cd /d """ & strPasta & """ && """ & strNode & """ server.js", 0, False

' Da um tempo para o servidor iniciar antes de abrir o navegador
WScript.Sleep 1500

' Abre a agenda no navegador padrao
objShell.Run "http://localhost:3000", 1, False
