import { Component, EventEmitter, Output } from '@angular/core';
import { RoutingService } from 'src/app/services/routing.service';
import { ArticleRouterBase } from 'src/app/components/common/article-router-base.component';

@Component({
  selector: 'peach-article-tree-node',
  template: `
  <div class="content">
    <p class="primary title" [routerLink]="[link]">{{ article.title }}</p>

    <mat-chip-list>
      <mat-chip *ngFor="let tag of article!.tags" (click)="tagClick.emit(tag)">{{ tag }}</mat-chip>
    </mat-chip-list>
  </div>
  `,
  styles: [`.content { margin-bottom: 2rem; }`]
})
export class ArticleTreeNodeComponent extends ArticleRouterBase {

  @Output('tagClick')
  public tagClick = new EventEmitter<string>();

  constructor(routingService: RoutingService) {
    super(routingService);
  }
}
