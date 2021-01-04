import { ComponentContext } from '@teambit/component';
import classNames from 'classnames';
import React, { useContext, useState, HTMLAttributes, useMemo } from 'react';
import { getIcon } from '@teambit/ui.get-icon-from-file-name';
import { SplitPane, Pane, Layout } from '@teambit/base-ui.surfaces.split-pane.split-pane';
import { HoverSplitter } from '@teambit/base-ui.surfaces.split-pane.hover-splitter';
import { Collapser } from '@teambit/ui.side-bar';
import { useLocation } from '@teambit/ui.routing.provider';
import { useCode } from '@teambit/ui.queries.get-component-code';
import { useFileContent } from '@teambit/ui.queries.get-file-content';
import styles from './code-tab-page.module.scss';
import { CodeTabTree } from './code-tab-tree';
import { CodeView } from './code-view';

type CodePageProps = {} & HTMLAttributes<HTMLDivElement>;

// should we move this file to code-tab-page folder?

export function CodePage({ className }: CodePageProps) {
  const component = useContext(ComponentContext);
  const { mainFile, fileTree = [], dependencies, devFiles } = useCode(component.id);
  const location = useLocation();
  const fileFromHash = useMemo(() => location.hash.replace('#', ''), [location.hash]);
  const currentFile = fileFromHash || mainFile;

  const fileContent = useFileContent(component.id, currentFile);

  const [isSidebarOpen, setSidebarOpenness] = useState(true);
  const sidebarOpenness = isSidebarOpen ? Layout.row : Layout.left;

  return (
    <SplitPane layout={sidebarOpenness} size="85%" className={classNames(styles.codePage, className)}>
      <Pane className={styles.left}>
        <CodeView fileContent={fileContent} currentFile={currentFile} icon={getIcon(currentFile)} />
      </Pane>
      <HoverSplitter className={styles.splitter}>
        <Collapser
          id="CodeTabCollapser"
          placement="left"
          isOpen={isSidebarOpen}
          onMouseDown={(e) => e.stopPropagation()} // avoid split-pane drag
          onClick={() => setSidebarOpenness((x) => !x)}
          tooltipContent={`${isSidebarOpen ? 'Hide' : 'Show'} file tree`}
          className={styles.collapser}
        />
      </HoverSplitter>
      <Pane className={styles.right}>
        <CodeTabTree currentFile={currentFile} dependencies={dependencies} fileTree={fileTree} devFiles={devFiles} />
      </Pane>
    </SplitPane>
  );
}
