import { Component } from '@angular/core';
import { RoutingService } from 'src/app/services/routing.service';
import { ArticleRouterBase } from 'src/app/components/common/article-router-base.component';

@Component({
  selector: 'peach-article-tree-node',
  template: `
  <div class="content">
    <p class="primary title" (click)="enrouteArticle()">{{ article.title }}</p>

    <mat-chip-list>
      <mat-chip *ngFor="let tag of article!.tags">{{ tag }}</mat-chip>
    </mat-chip-list>
  </div>
  `,
  styles: [`.content { margin-bottom: 2rem; }`]
})
export class ArticleTreeNodeComponent extends ArticleRouterBase {

  constructor(routingService: RoutingService) {
    super(routingService);
  }
}
