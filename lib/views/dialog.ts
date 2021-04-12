import { TextEditor } from "atom"

export default class Dialog {  
  public static async prompt (message: string): Promise<string>
  {
    const miniEditor = new TextEditor({ mini: true })
    const editorElement = atom.views.getView(miniEditor)

    const messageElement = document.createElement('div')
    messageElement.classList.add('message')
    messageElement.textContent = message

    const element = document.createElement('div')
    element.classList.add('prompt')
    element.appendChild(editorElement)
    element.appendChild(messageElement)

    const panel = atom.workspace.addModalPanel({
      item: element,
      visible: true
    })
    
    editorElement.focus()
        
    return new Promise((resolve, reject) => {
      atom.commands.add(editorElement, 'core:confirm', () => {
        resolve(miniEditor.getText())
        panel.destroy()
      })
      atom.commands.add(editorElement, 'core:cancel', () => {
        reject()
        panel.destroy()
      })
      
    })    
  }
}