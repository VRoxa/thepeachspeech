import { Component, OnInit } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Router } from '@angular/router';
import { ArticlesService } from 'src/app/services/articles.service';
import { map } from 'rxjs';
import { Article } from 'src/app/models/article.model';

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

  const includeChildrenCounter = (node: ArticlesTreeNode) => {
    const { length } = node.children!;
    const name = `${node.name} (${length})`;
    return {...node, name};
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
    }, [])
    .map(includeChildrenCounter);
}

@Component({
  selector: 'peach-articles-tree',
  templateUrl: './articles-tree.component.html',
  styleUrls: ['./articles-tree.component.scss']
})
export class ArticlesTreeComponent implements OnInit {

  public treeControl = new FlatTreeControl<ArticlesTreeFlatNode>(
    ({ level }) => level,
    ({ expandable }) => expandable,
  );

  private treeFlattener = new MatTreeFlattener(
    // Transformer, projects ArticlesTreeNode into ArticlesTreeFlatNode
    ({ name, children }: ArticlesTreeNode, level: number) => ({
      expandable: !!children && children.length > 0,
      name,
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

  public enrouteArticle = (name: string) => {
    const { url } = this.nodes
      .flatMap(node => node.children!)
      .find(({ name: n }) => n === name)!;

    this.router.navigate([url], { relativeTo: this.router.routerState.root });
  }

  public hasChild = (_: number, { expandable }: ArticlesTreeFlatNode) => expandable;
}
