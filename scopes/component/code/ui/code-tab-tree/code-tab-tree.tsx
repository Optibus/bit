import React, { useState, useCallback, useMemo, HTMLAttributes } from 'react';
import classNames from 'classnames';
import { FileTree } from '@teambit/tree.file-tree';
import { DrawerUI } from '@teambit/tree.drawer';
import { TreeNode as Node } from '@teambit/tree.tree-node';
// import { Label } from '@teambit/documenter.ui.label';
import { getIcon } from '@teambit/ui.get-icon-from-file-name';
import type { DependencyType } from '@teambit/ui.queries.get-component-code';
import { FolderTreeNode } from '@teambit/tree.folder-tree-node';
import { DependencyTree } from '../dependency-tree';

import styles from './code-tab-tree.module.scss';

export type CodeTabTreeProps = {
  fileTree: any[];
  dependencies?: DependencyType[];
  currentFile?: string;
  devFiles?: string[];
} & HTMLAttributes<HTMLDivElement>;

export function CodeTabTree({ className, fileTree, dependencies, currentFile = '', devFiles }: CodeTabTreeProps) {
  const [openDrawerList, onToggleDrawer] = useState(['FILES', 'DEPENDENCIES']);

  const handleDrawerToggle = (id: string) => {
    const isDrawerOpen = openDrawerList.includes(id);
    if (isDrawerOpen) {
      onToggleDrawer((list) => list.filter((drawer) => drawer !== id));
      return;
    }
    onToggleDrawer((list) => list.concat(id));
  };

  // TODO - handle labels for main file or dev
  const widgets = [];

  const TreeNodeRenderer = useCallback(
    function TreeNode(props: any) {
      const children = props.node.children;
      if (!children) {
        return (
          <Node {...props} isActive={props.node.id === currentFile} icon={getIcon(props.node.id)} widgets={widgets} />
        );
      }
      return <FolderTreeNode {...props} />;
    },
    [currentFile, widgets]
  );

  const fileDrawer = useMemo(() => {
    const Tree = () => <FileTree TreeNode={TreeNodeRenderer} files={fileTree || ['']} />;
    return {
      name: 'FILES',
      render: Tree,
    };
  }, [fileTree, currentFile]);

  const dependencyDrawer = useMemo(() => {
    const Tree = () => <DependencyTree dependenciesArray={dependencies} />;
    return {
      name: 'DEPENDENCIES',
      render: Tree,
    };
  }, [dependencies]);

  return (
    <div className={classNames(styles.codeTabTree, className)}>
      <DrawerUI
        isOpen={openDrawerList.includes(fileDrawer.name)}
        onToggle={() => handleDrawerToggle(fileDrawer.name)}
        drawer={fileDrawer}
        className={classNames(styles.codeTabDrawer)}
      />
      <DrawerUI
        isOpen={openDrawerList.includes(dependencyDrawer.name)}
        onToggle={() => handleDrawerToggle(dependencyDrawer.name)}
        drawer={dependencyDrawer}
        className={classNames(styles.codeTabDrawer)}
      />
    </div>
  );
}
