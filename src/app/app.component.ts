import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, Observable, of, tap } from 'rxjs';
import { ArticlesService } from './services/articles.service';
import { sswitch } from './utils/rx-operators';

interface TitleView {
  title?: string;
  isRoot?: boolean;
  isFound?: boolean;
}

const getTitle = ({ title, isFound, isRoot }: TitleView) => {
  const rootTitle = `The Peach Speech`;
  return isRoot || !isFound
    ? rootTitle
    : `${title} | ${rootTitle}`;
}

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit { 

  constructor(
    private service: ArticlesService,
    private title: Title,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const getArticleTitle = (url: string): Observable<TitleView> => {
      return this.service.getArticleBy(url).pipe(
        map(article => ({
          title: article?.title,
          isFound: !!article
        }))
      );
    }

    this.router.events.pipe(
      filter(evt => evt instanceof NavigationEnd),
      map(() => this.route.firstChild),
      // Pipe the observable to the route params observable,
      // if the current route has a child.
      sswitch(
        route => !!route,
        route => route!.paramMap.pipe(map(params => params.get('url'))),
        _ => of(null)
      ),
      // Map the article URL if found as param.
      sswitch(
        url => !!url,
        url => getArticleTitle(url!),
        _ => of({ isRoot: true })
      ),
      map(getTitle),
      tap(title => this.title.setTitle(title))
    ).subscribe();
  }
}
