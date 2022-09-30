import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { ArticlesService } from 'src/app/services/articles.service';
import { combineLatest, map, startWith, tap } from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { valueFromEvent } from 'src/app/utils/rx-factories';

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

  constructor(private service: ArticlesService) { }

  ngAfterViewInit(): void {
    const searchTerm$ = valueFromEvent(this.filter.nativeElement).pipe(
      map(searchTerm => searchTerm.toLowerCase()),
      startWith(``)
    );

    const nodes$ = this.service.getArticles().pipe(
      map(projectArticles)
    );

    combineLatest([nodes$, searchTerm$]).pipe(
      // Filter articles by search term.
      map(([nodes, searchTerm]) => {
        const filteredNodes = nodes.map(node => {
          const filtered = node.children!.filter(({ name }) => name.toLowerCase().includes(searchTerm));
          return { 
            ...node, 
            children: filtered
          };
        });
        
        return [filteredNodes, searchTerm] as const;
      }),
      // Filter empty groups.
      map(([nodes, searchTerm]) => {
        const filteredNodes = nodes.filter(({children}) => !!children && children.length > 0);
        return [filteredNodes, searchTerm] as const;
      }),
      tap(([nodes]) => (this.dataSource.data = nodes)),
      // Expand all nodes if the searchTerm is not empty.
      tap(([_, searchTerm]) => !!searchTerm && this.treeControl.expandAll()),
    ).subscribe();
  }

  public hasChild = (_: number, { expandable }: ArticlesTreeFlatNode) => expandable;
}
