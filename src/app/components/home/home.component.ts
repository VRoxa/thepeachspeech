import { Component, OnInit } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { ArticlesService } from 'src/app/services/articles.service';

const orderByDateDesc = <T extends { date: Date }>(elements: T[]) => {
  return [...elements].sort(
    ({ date: a }, { date: b }) => b.valueOf() - a.valueOf()
  );
}

@Component({
  selector: 'peach-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  public articles$!: Observable<Article[]>;

  constructor(private service: ArticlesService) { }

  ngOnInit(): void {
    // Takes the first three most recent articles
    this.articles$ = this.service.getArticles()
      .pipe(
        map(orderByDateDesc),
        map(articles => articles.slice(0, 3))
      );
  }

}
