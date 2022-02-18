import { Component } from '@angular/core';
import { RoutingService } from 'src/app/services/routing.service';
import { ArticleRouterBase } from '../../common/article-router-base.component';

@Component({
  selector: 'peach-article-tree-node',
  templateUrl: './article-tree-node.component.html',
  styleUrls: ['./article-tree-node.component.scss']
})
export class ArticleTreeNodeComponent extends ArticleRouterBase {
  
  constructor(routingService: RoutingService) { 
    super(routingService);
  }
}


