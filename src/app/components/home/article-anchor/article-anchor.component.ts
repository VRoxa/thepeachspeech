import { Component, Input } from '@angular/core';
import { RoutingService } from 'src/app/services/routing.service';
import { ArticleRouterBase } from 'src/app/components/common/article-router-base.component';

export type ScaleFactor = 'small' | 'medium' | 'large';

@Component({
  selector: 'peach-article-anchor',
  templateUrl: './article-anchor.component.html',
  styleUrls: ['./article-anchor.component.scss']
})
export class ArticleAnchorComponent extends ArticleRouterBase {
  @Input() public scaleFactor: ScaleFactor = 'large';

  constructor(routingService: RoutingService) { 
    super(routingService);
  }
}
