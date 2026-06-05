import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export interface SoulNode {
  id: string;
  name: string;
  subject_name: string;
  generation: number;
  parent_id?: string;
  avatar_url?: string;
  created_at: string;
  personality?: Record<string, number>;
}

export interface FamilyTreeProps {
  roots: SoulNode[];
  allNodes: SoulNode[];
}

function TreeNode({ node, allNodes, depth = 0, isLast = false }: {
  node: SoulNode;
  allNodes: SoulNode[];
  depth?: number;
  isLast?: boolean;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = allNodes.filter(n => n.parent_id === node.id);
  const hasChildren = children.length > 0;

  const indentPx = depth * 28;
  const sizeClass = depth === 0 ? 'w-12 h-12' : depth === 1 ? 'w-10 h-10' : 'w-8 h-8';

  return (
    <div className="select-none">
      <div className="flex items-start gap-3 py-1 group">
        {/* Connector lines */}
        <div className="flex-shrink-0 pt-4" style={{ width: indentPx }}>
          {depth > 0 && (
            <>
              <div className="absolute" style={{ left: indentPx - 20, top: 0, width: 20, height: '100%' }}>
                <div className="border-l-2 border-zinc-700 h-full" style={{ borderTopLeftRadius: isLast ? 8 : 0 }} />
              </div>
              <div className="h-px bg-zinc-700 w-5" />
            </>
          )}
        </div>

        {/* Node */}
        <div className="flex items-center gap-3 flex-1 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
          {hasChildren && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
            >
              {expanded ? '▾' : '▸'}
            </button>
          )}
          <div className="flex-shrink-0">
            {node.avatar_url ? (
              <div className={`${sizeClass} rounded-full relative ring-2 ring-indigo-500/30`}>
              <Image
                src={node.avatar_url}
                alt={node.name}
                fill
                className="rounded-full object-cover"
                sizes="80px"
                loading="lazy"
              />
            </div>
            ) : (
              <div className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-sm font-medium ring-2 ring-indigo-500/30`}>
                {node.subject_name?.[0]?.toUpperCase() || node.name[0]}
              </div>
            )}
          </div>

          <Link
            href={`/soul/${node.id}`}
            className="flex-1 min-w-0"
          >
            <div className="font-medium text-zinc-200 hover:text-indigo-400 transition-colors truncate">
              {node.subject_name || node.name}
            </div>
            <div className="text-xs text-zinc-500">
              Gen {node.generation} · {new Date(node.created_at).toLocaleDateString()}
            </div>
          </Link>

          {node.personality && (
            <div className="hidden md:flex gap-1 flex-shrink-0">
              {Object.entries(node.personality).slice(0, 3).map(([k, v]) => (
                <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="ml-2">
          {children.map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              allNodes={allNodes}
              depth={depth + 1}
              isLast={i === children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FamilyTree({ roots, allNodes }: FamilyTreeProps) {
  if (allNodes.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <div className="text-4xl mb-4">🌳</div>
        <div className="text-lg">No soul lineage yet</div>
        <div className="text-sm mt-2">Evolve a soul to create family branches</div>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-x-auto">
      {roots.map((root, i) => (
        <TreeNode key={root.id} node={root} allNodes={allNodes} isLast={i === roots.length - 1} />
      ))}
    </div>
  );
}

export function FamilyTreeSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className={`ml-${i * 4}`} />
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
