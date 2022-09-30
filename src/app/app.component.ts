import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { concat, defer, filter, map, of, switchMap } from 'rxjs';
import { ArticlesService } from './services/articles.service';

interface TitleView {
  title?: string;
  isRoot?: boolean;
  isFound?: boolean;
}

const getTitle = ({ title, isFound, isRoot }: TitleView) => {
  const rootTitle = `The Peach Speech`;
  return isRoot
    ? rootTitle
    : isFound
      ? `${title} | ${rootTitle}`
      : `Not found | ${rootTitle}`;
}

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit { 

  constructor(
    private service: ArticlesService,
    private title: Title,
    private router: Router
  ) { }

  ngOnInit(): void {
    const title$ = concat(
      of(this.router.url),
      this.router.events.pipe(
        filter(evt => evt instanceof NavigationEnd),
        map(evt => evt as NavigationEnd),
        map(({url}) => url),
      )
    ).pipe(
      map(url => url.split('/')[2]),
      switchMap(articleUrl => defer(() => !!articleUrl
        ? this.service.getArticleBy(articleUrl).pipe(
            map(article => <TitleView>({
              title: article?.title,
              isFound: !!article
            }))
          )
        : of(<TitleView>{ isRoot: true })
      )),
      map(getTitle)
    );

    title$.subscribe(title =>
      this.title.setTitle(title)
    );
  }
}
