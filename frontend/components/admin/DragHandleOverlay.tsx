import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragHandleOverlayProps {
  editor: Editor | null;
}

export default function DragHandleOverlay({ editor }: DragHandleOverlayProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragPosRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editor || !editor.view) return;

    const view = editor.view;
    const dom = view.dom;

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) return;

      const target = e.target as HTMLElement;
      
      // Don't show handle when hovering over the handle itself to prevent flicker
      if (handleRef.current?.contains(target)) return;
      
      // Ensure we're inside the editor DOM
      if (!dom.contains(target) && target !== dom) {
        setPos(null);
        return;
      }

      // Find the closest block-level DOM node
      let node = target;
      while (node && node !== dom) {
        if (node.nodeType === 1) { // Element node
          const display = window.getComputedStyle(node).display;
          if (display === 'block' || display === 'flex' || display === 'grid' || display === 'list-item') {
             // Find ProseMirror pos for this DOM node
             try {
                const pmPos = view.posAtDOM(node, 0);
                if (pmPos >= 0) {
                  const $pos = view.state.doc.resolve(pmPos);
                  // Find the root block node (depth 1 is usually the direct child of doc)
                  const depth = $pos.depth;
                  if (depth >= 1) {
                    const blockPos = $pos.before(1);
                    const domNode = view.nodeDOM(blockPos) as HTMLElement;
                    if (domNode && domNode.nodeType === 1 && domNode.getBoundingClientRect) {
                        // Exclude table cells/rows from root dragging (can't drag out of table usually)
                        const pmNode = view.state.doc.nodeAt(blockPos);
                        if (pmNode && pmNode.type.name.includes('table')) {
                          // Allow dragging tables, but ensure we got the table root, not cell
                        }
                        
                        const rect = domNode.getBoundingClientRect();
                        const editorRect = dom.parentElement?.getBoundingClientRect();
                        
                        if (editorRect) {
                           setPos({
                             top: rect.top - editorRect.top + dom.parentElement!.scrollTop,
                             left: -32 // Position to the left of the editor content
                           });
                           dragPosRef.current = blockPos;
                           return; // Found our block
                        }
                    }
                  }
                }
             } catch (err) {
               // Ignore posAtDOM errors
             }
          }
        }
        node = node.parentElement as HTMLElement;
      }
      
      setPos(null);
    };

    const onMouseLeave = (e: MouseEvent) => {
      // Small timeout to allow mouse to move to handle
      setTimeout(() => {
         if (!handleRef.current?.matches(':hover') && !isDragging) {
           setPos(null);
         }
      }, 50);
    };

    dom.parentElement?.addEventListener('mousemove', onMouseMove);
    dom.parentElement?.addEventListener('mouseleave', onMouseLeave);

    return () => {
      dom.parentElement?.removeEventListener('mousemove', onMouseMove);
      dom.parentElement?.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [editor, isDragging]);

  if (!editor || !pos) return null;

  const handleDragStart = (e: React.DragEvent) => {
    if (dragPosRef.current === null) return;
    setIsDragging(true);

    const view = editor.view;
    const node = view.state.doc.nodeAt(dragPosRef.current);
    if (!node) return;

    // Set dragging data for ProseMirror drop system
    const slice = view.state.doc.slice(dragPosRef.current, dragPosRef.current + node.nodeSize);
    
    // Fallback text
    e.dataTransfer.setData('text/plain', node.textContent);
    // ProseMirror standard drag payload
    e.dataTransfer.setData('application/x-prosemirror-slice', 'true');
    // Store pos for internal drop handling if needed
    e.dataTransfer.setData('text/pm-drag-pos', dragPosRef.current.toString());

    // ProseMirror creates its own dragging state, but we select the node so it renders as dragged
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, dragPosRef.current)));

    // Create a drag image if possible
    const domNode = view.nodeDOM(dragPosRef.current) as HTMLElement;
    if (domNode) {
      e.dataTransfer.setDragImage(domNode, 0, 0);
    }
    
    // We let ProseMirror handle the actual drop via its built-in dropcursor and drag/drop handlers
    // ProseMirror listens to the drop event on the editor DOM.
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setPos(null);
  };

  return (
    <div
      ref={handleRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "absolute z-[50] flex items-center justify-center w-6 h-6 rounded cursor-grab active:cursor-grabbing hover:bg-slate-800 text-slate-500 hover:text-cyan-400 transition-colors",
        isDragging && "opacity-0" // Hide handle while dragging
      )}
      style={{
        top: pos.top + 2, // slight adjustment for alignment
        left: pos.left,
      }}
    >
      <GripVertical className="w-4 h-4" />
    </div>
  );
}
