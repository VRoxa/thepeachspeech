import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Article } from 'src/app/models/article.model';

@Component({
  selector: 'peach-article-not-found',
  templateUrl: './article-not-found.component.html',
  styleUrls: ['./article-not-found.component.scss']
})
export class ArticleNotFoundComponent {
  @Input() article$!: Observable<Article | undefined>;

  constructor(private router: Router) { }

  public navigateHome = () => {
    this.router.navigate(['/']);
  }
}
