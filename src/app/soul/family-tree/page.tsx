"use client";

import { useState, useEffect, useCallback } from 'react';

interface TreeNode {
  id: string;
  name: string;
  type: string;
  generation?: number;
  avatar_url?: string;
  children?: TreeNode[];
}

export default function FamilyTreePage() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSoul, setSelectedSoul] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedSoul ? `?soul_id=${selectedSoul}` : '';
      const res = await fetch(`/api/soul/family-tree${params}`);
      const data = await res.json();
      setTreeData(data.allNodes || []);
    } catch {
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSoul]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Soul Family Tree</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {treeData.map((node) => (
          <div
            key={node.id}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                {node.type === 'soul' ? '👤' : node.type === 'version' ? '📋' : '🛡️'}
              </div>
              <div>
                <h3 className="font-semibold">{node.name}</h3>
                <span className="text-xs text-gray-500">{node.type} · gen {node.generation ?? 0}</span>
              </div>
            </div>
          </div>
        ))}
        {treeData.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-12">
            No soul data found. Create or import a soul to see the family tree.
          </div>
        )}
      </div>
    </div>
  );
}
