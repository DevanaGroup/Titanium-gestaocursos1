import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import '../styles/tiptap.css';

interface RichTextViewerProps {
  content: string;
  className?: string;
}

export default function RichTextViewer({ 
  content, 
  className = ""
}: RichTextViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    editable: false, // Chave para somente leitura
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  });

  if (!editor) {
    return null;
  }

  // Se não há conteúdo válido
  if (!content || content.trim() === '' || content === '<p></p>') {
    return (
      <div className={`text-sm text-muted-foreground italic ${className}`}>
        Sem conteúdo de despacho
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 min-h-[120px] ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
} 