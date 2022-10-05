import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { ArticlesService } from 'src/app/services/articles.service';
import { combineLatest, concat, map, Observable, of, scan, startWith, Subject, tap } from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { valueFromEvent } from 'src/app/utils/rx-factories';
import { orderByDateDesc } from 'src/app/utils/utils';

interface TagAction {
  tag: string;
  action: 'add' | 'remove';
}

interface ArticlesTreeNode {
  name: string;
  children?: ArticlesTreeNode[];
  article?: Article;
}

interface ArticlesTreeFlatNode {
  expandable: boolean;
  name: string;
  level: number;
  article?: Article;
}

const projectArticles = (articles: Article[]): ArticlesTreeNode[] => {
  const formatDate = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('default', {
      month: 'long',
      year: 'numeric'
    });

    return formatter.format(date);
  }

  // Replace reduce function to groupBy when publicly released
  // https://github.com/tc39/proposal-array-grouping
  return articles
    .reduce<ArticlesTreeNode[]>((acc, article: Article) => {
      const { title: name, date } = article;
      const node = { name, article };
      const key = formatDate(date!);
      
      const existing = acc.find(({ name }) => name === key);
      if (!!existing) {
        existing.children = [...existing.children!, node];
        return acc;
      }

      return [...acc, { name: key, children: [node] }];
    }, []);
}

@Component({
  selector: 'peach-articles-repository',
  templateUrl: './articles-repository.component.html',
  styleUrls: ['./articles-repository.component.scss']
})
export class ArticlesRepositoryComponent implements AfterViewInit {

  @ViewChild('filter', { static: true }) filter!: ElementRef<HTMLInputElement>;

  private tagActions$ = new Subject<TagAction>();
  public tagsFilter$: Observable<string[]>;

  public treeControl = new FlatTreeControl<ArticlesTreeFlatNode>(
    ({ level }) => level,
    ({ expandable }) => expandable,
  );

  private treeFlattener = new MatTreeFlattener<ArticlesTreeNode, ArticlesTreeFlatNode>(
    // transformFn, projects ArticlesTreeNode into ArticlesTreeFlatNode
    ({ name, children, article }, level) => ({
      expandable: !!children,
      name: `${name} ${!!children ? `(${children.length})` : ''}`,
      level,
      article: article!
    }),
    // getLevel
    ({ level }) => level,
    // isExpandable
    ({ expandable }) => expandable,
    // getChildren
    ({ children }) => children,
  );

  public dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  constructor(private service: ArticlesService) { 
    this.tagsFilter$ = concat(
      of<string[]>([]),
      this.tagActions$.pipe(
        scan(
          (tags: string[], {tag, action}: TagAction) => action === 'add'
            ? [...new Set([...tags, tag])]
            : tags.filter(t => t !== tag),
          [])
      )
    );
  }

  ngAfterViewInit(): void {
    const searchTerm$ = valueFromEvent(this.filter.nativeElement).pipe(
      map(searchTerm => searchTerm.toLowerCase()),
      startWith(``)
    );

    const nodes$ = this.service.getArticles().pipe(
      map(orderByDateDesc),
      map(projectArticles)
    );

    combineLatest([nodes$, searchTerm$, this.tagsFilter$]).pipe(
      // TODO - Find an elegant way to avoid parameter waterfall.
      // searchTerm and tagsFilter are used for filtering,
      // but also to expand (or not) the data tree.
      // We cannot expand the data tree until the new data is set,
      // So we "have" to drag these two values all along the stream. 

      // Filter articles by tags
      map(([nodes, searchTerm, tagsFilter]) => {
        const filteredNodes = !tagsFilter.length
          ? nodes
          : nodes.map(node => ({
            ...node,
            children: node.children!.filter(({ article }) => tagsFilter.every(t => article!.tags.includes(t)))
          }));

        return [filteredNodes, searchTerm, tagsFilter] as const;
      }),
      // Filter articles by search term.
      map(([nodes, searchTerm, tagsFilter]) => {
        const filteredNodes = nodes.map(node => ({
          ...node,
          children: node.children!.filter(({ name }) => name.toLowerCase().includes(searchTerm))
        }));
        
        return [filteredNodes, searchTerm, tagsFilter] as const;
      }),
      // Filter empty groups.
      map(([nodes, searchTerm, tagsFilter]) => {
        const filteredNodes = nodes.filter(({children}) => !!children && children.length > 0);
        return [filteredNodes, searchTerm, tagsFilter] as const;
      }),
      tap(([nodes]) => (this.dataSource.data = nodes)),
      // Expand all nodes if the searchTerm or the tags filter are not empty.
      tap(([_, searchTerm, tagsFilter]) =>
        (!!searchTerm || tagsFilter.length > 0) && this.treeControl.expandAll())
    ).subscribe();
  }

  public hasChild = (_: number, { expandable }: ArticlesTreeFlatNode) => expandable;

  addTagFilter = (tag: string) => {
    this.tagActions$.next({
      tag,
      action: 'add'
    });
  }

  removeTagFilter = (tag: string) => {
    this.tagActions$.next({
      tag,
      action: 'remove'
    });
  }
}
