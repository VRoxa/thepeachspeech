import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Article } from 'src/app/models/article.model';
import { ArticlesService } from 'src/app/services/articles.service';

@Component({
  selector: 'peach-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  public articles$!: Observable<Article[]>;

  constructor(private service: ArticlesService) { }

  ngOnInit(): void {
    this.articles$ = this.service.getArticles();
  }

}
