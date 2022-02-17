import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Router } from '@angular/router';
import { ArticlesService } from 'src/app/services/articles.service';
import { map } from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { valueFromEvent } from 'src/app/utils/rx-factories';

interface ArticlesTreeNode {
  name: string;
  url?: string;
  children?: ArticlesTreeNode[];
}

interface ArticlesTreeFlatNode {
  expandable: boolean;
  name: string;
  level: number;
}

const projectArticles = (articles: Article[]): ArticlesTreeNode[] => {
  const formatDate = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('default', {
      month: 'long',
      year: 'numeric'
    });

    return formatter.format(date);
  }

  return articles
    .reduce<ArticlesTreeNode[]>((acc, { title, url, date }) => {
      const node = { name: title, url: `/${url}` };
      const key = formatDate(date!);

      const existing = acc.find(({ name }) => name === name);
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

  private treeFlattener = new MatTreeFlattener(
    // Transformer, projects ArticlesTreeNode into ArticlesTreeFlatNode
    ({ name, children }: ArticlesTreeNode, level: number) => ({
      expandable: !!children,
      name: `${name} ${!!children ? `(${children.length})` : ''}`,
      level
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

  constructor(
    private service: ArticlesService,
    private router: Router) { }

  ngOnInit(): void {
    this.service.getArticles()
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
    this.dataSource.data = nodes;
  }

  public enrouteArticle = (name: string) => {
    const { url } = this.nodes
      .flatMap(node => node.children!)
      .find(({ name: n }) => n === name)!;

    this.router.navigate([url], { relativeTo: this.router.routerState.root });
  }

  public hasChild = (_: number, { expandable }: ArticlesTreeFlatNode) => expandable;
}
