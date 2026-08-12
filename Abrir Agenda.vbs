Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strPasta = objFSO.GetParentFolderName(WScript.ScriptFullName)
strNode = objShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\node-portable\node.exe"
strEnvLocal = strPasta & "\.env.local"

If Not objFSO.FileExists(strEnvLocal) Then
  MsgBox "Falta o arquivo .env.local com a conexao do banco Postgres." & vbCrLf & _
         "Veja o README.md, secao ""Rodar localmente"".", vbExclamation, "Agenda Odontologica"
  WScript.Quit 1
End If

' Sobe o servidor em segundo plano, sem abrir janela de terminal
objShell.Run "cmd /c cd /d """ & strPasta & """ && """ & strNode & """ --env-file=.env.local server.js", 0, False

' Da um tempo para o servidor iniciar antes de abrir o navegador
WScript.Sleep 1500

' Abre a agenda no navegador padrao
objShell.Run "http://localhost:3000", 1, False
