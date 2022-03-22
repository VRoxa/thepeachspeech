import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { ArticlesService } from 'src/app/services/articles.service';
import { map } from 'rxjs';
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
export class ArticlesRepositoryComponent implements OnInit, AfterViewInit {

  @ViewChild('filter', { static: true }) filter!: ElementRef<HTMLInputElement>;

  public treeControl = new FlatTreeControl<ArticlesTreeFlatNode>(
    ({ level }) => level,
    ({ expandable }) => expandable,
  );

  private treeFlattener = new MatTreeFlattener<ArticlesTreeNode, ArticlesTreeFlatNode>(
    // Transformer, projects ArticlesTreeNode into ArticlesTreeFlatNode
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
  public nodes!: ArticlesTreeNode[];

  constructor(private articlesService: ArticlesService) { }

  ngOnInit(): void {
    this.articlesService.getArticles()
      .pipe(map(projectArticles))
      .subscribe(nodes => {
        this.nodes = nodes;
        this.dataSource.data = this.nodes;
      });
  }

  ngAfterViewInit(): void {
    valueFromEvent(this.filter.nativeElement).subscribe(this.filterNodes);
  }

  private filterNodes = (searchValue: string) => {
    const filterValue = searchValue.toLowerCase();
    const nodes = this.nodes.map(node => {
      const filtered = node.children!.filter(({ name }) => name.toLowerCase().includes(filterValue));
      return { 
        ...node, 
        children: filtered
     };
    });

    this.dataSource.data = nodes.filter(
      ({ children }) => !!children && children.length > 0
    );
  }

  public hasChild = (_: number, { expandable }: ArticlesTreeFlatNode) => expandable;
}
