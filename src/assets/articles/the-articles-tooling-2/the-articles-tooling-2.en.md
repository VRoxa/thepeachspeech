I recently tried to implement my own tooling program to upload articles more easily. I explained how the adventure went [in my latest article](https://vroxa.github.io/thepeachspeech/article/the-articles-tooling) – *spoiler*: not so good. I realized how frustrating working with *nodegit* was, that I switched to another Git library. However, I managed to connect to GitHub to clone, fetch and push authenticating the calls with SSH keys; so I want to still use that bit.

### The final Git solution

I want to grab all the ~~working~~ code from the last session and put it in a service altogether. This service is going to manage the repository remote access; thus, it’s called `RepositoryManager`. This service is a singleton in my application, it will be initialized on the application start-up.  
The `setup` function will initialize the `RepositoryManager` after cleaning the repository folder, `clone` the repository and `fetch` the latest changes.

```typescript
// setup.ts
const cleanUpEnvironment = (): Promise<void> => {
  return new Promise(resolve => {
    rimraf(env.repositoryPath, () => {
      resolve();
    });
  });
}

export const setup = async (): Promise<RepositoryManager> => {
  await cleanUpEnvironment();
  
  const manager = new RepositoryManager();
  await manager.clone(env.repositoryUrl, env.repositoryPath);
  await manager.fetch();

  return manager;
}
```

I pulled some environment variables out to be shared along the application, as if it was the typical Angular environment object.

```typescript
// environment.ts
import { join } from 'path';

export default {
  repositoryUrl: 'git@github.com:VRoxa/test-nodegit.git',
  repositoryPath: join(__dirname, '../../repository'),
  keysPath: join(__dirname, '../../keys')
}
```

Since the `RepositoryManager` is a singleton, it stores the repository reference internally once it is cloned.  
I think it’s totally fine, even if the manager is a singleton, every manager should have their own created repository (without sharing it to the outside); having a 1:1 relationship.

```typescript
// repository-manager.ts
import { Clone, FetchOptions, Remote, Repository } from "nodegit";
import { getCredentialsCallbacks } from "./credentials";

export class RepositoryManager {

  private repository!: Repository;

  clone = async (repositoryUrl: string, cloningPath: string) => {
    this.repository = await Clone.clone(
      repositoryUrl, 
      cloningPath, 
      { 
        bare: 0,
        fetchOpts: {
          callbacks: getCredentialsCallbacks()
        }
      }
    );
  }

  fetch = async () => {
      // Fetch any change from the remote 'master' branch
    const remote = await Remote.lookup(this.repository, 'origin');
    
    const options: FetchOptions = {
      downloadTags: 1,
      prune: 1,
      updateFetchhead: 1,
      callbacks: getCredentialsCallbacks()
    };

    await remote.fetch(['+refs/*:refs/*'], options, 'Automated');
  }

  push = async () => {
    const remote = await Remote.lookup(this.repository, 'origin');
    await remote.push(
      ['refs/heads/master:refs/heads/master'],
      { callbacks: getCredentialsCallbacks() }
    );
  }
}
```

The `getCredentialsCallbacks` function is the exact same thing I had before. The only change I made was to retrieve the SSH keys folder path from the environment object.

#### Commit changes

You can tell the `RepositoryManager` has no `commit` function. I’d love it to have one, but that’s exactly what I tried before and roughly failed in the process.  
I decided to keep it simple. So, I searched *nodegit* alternatives until I found the [simple-git](https://github.com/steveukx/git-js) library. The *simple-git* library wraps Git commands in a **simple** way, which becomes very handy to work in.

As you may noticed, the `RepositoryManager`'s `clone` function options specify to clone the repository as a **non-bare repository**, so it downloads all the actual files of the repository as well as the *.git* reference folder. Having the source code files makes the thing a lot easier to handle.

I implemented the `createCommit` function, using *simple-git*, which takes a commit message, stages any changed file in the repository and creates a commit. Simple enough.

```typescript
// create-commit.ts
import environment from '../../environment/environment';
import git from 'simple-git';


export const createCommit = async (message: string) => {
  // Configures the repository instance to the rpeository path
  const repository = git(environment.repositoryPath);
    
  // Stages every file
  await repository.add('./*');
  // Creates the commit
  await repository.commit(message);
}
```

### Accessing repository files

As I said, I discarded the idea of working with blobs and trees. It sounds fancy and exciting, but I don’t want my hair to fall off too early trying to explore these obscure topics (yet?). Accessing the files is as easy as to use any CRUD operation on files is in *node* using the `fs` module.

```typescript
// file-access.ts
import environment from '../../environment/environment';
import { join } from 'path';
import fs from 'fs';

export class FileAccess {

  getContent = async (path: string): Promise<string> => {
    const fullPath = this.getPath(path);
    const content: string = await fs.promises.readFile(
      fullPath,
      { encoding: 'utf8' }
    );
    return content;
  }
  
  addOrUpdateFile = async (
    path: string,
    content: string
  ): Promise<void> => {
      
    const fullPath = this.getPath(path);
    await fs.promises.writeFile(
      fullPath,
      content,
      { encoding: 'utf8' }
    );
  }

  deleteFile = async (path: string): Promise<void> => {
    const fullPath = this.getPath(path);
    await fs.promises.unlink(fullPath);
  }

  private getPath = (fullPath: string): string => {
    return join(
      environment.repositoryPath,
      fullPath
    );
  }
}
```

Now I can use the `FileAccess` class to implement the `ArticlesService`. The `ArticlesService` implements the articles’ CRUD operations following a repository pattern (kind of) but targeting files instead of a database – it could be renamed to `ArticlesRepository` but there is another concept of repository in my domain, so I prefer the *service* term, here.

The `Article` model is extracted from the [site repository](https://github.com/VRoxa/thepeachspeech). It is the “link” from one project to the other and they definitely must be exactly the same.  
I introduced the `ArticleDto` model, which includes the `filePath` property. The `ArticleDto` is specific for this project and it will be the representation of an article in creation. You can take a look at both models in the [source code](https://github.com/VRoxa/thepeachspeech-tool/blob/master/src/models/article.model.ts).

> Since the `Article` model is shared between the site’s Angular project and the tooling, I should clearly extract the definition to a shared module both projects refer to. However, I don’t mind this too much in my case. It’s just a tiny model I can duplicate and it is not going to be changed at all (or that much).  
> This is something I would do when working in a more complex domain, for sure.

I applied some article concrete logics in the `ArticleService` when dealing the CRUD operations.  
Even though the service is nothing very exciting to look, I took to opportunity to barely play with the Typescript utility types. You see, the `Article` model has the `date` field, which is a `Date`. The JSON file I have to read the articles from returns a collection of objects that include the `date` field as `string`. I declared the `RawArticle` alias which overrides the `date` field as `string`. The service reads the file as a `RawArticle` collection and maps every element to an `Article`.

```typescript
// articles-service.ts

type RawArticle = Omit<Article, 'date'> & { date: string };

export class ArticlesService {
    
  constructor(private fileAccess: FileAccess) { }
    
  getAll = async (): Promise<Article[]> => {
    // The articlesJsonFilePath is the path of the file in the cloned repository
    const articlesJson = await this.fileAccess.getContent(articlesJsonFilePath);
    const articles: RawArticle[] = JSON.parse(articlesJson);
    return articles.map(article => {
      ...article,
      date: new Date(article.date)
    });
  }

  // add, update, delete functions
}
```

> [Utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html) are the Typescript feature I like the most, no doubts. They are something I always try to add when necessary (I even think I sometimes tend to force myself to use them even when they are not strictly necessary, just for the sake of fun).
>
> The Typescript type system can be widely exploited with utility types (and other type related features) to get mind-blowing solutions. As an example, the `OneOf`, which results in a type where only one field from a given base type is allowed.
>
> ```typescript
> type OneOf<T, K extends keyof T> = {
>   [Key in K]: Pick<Required<T>, Key> & { 
>     [InnerKey in Exclude<K, Key>]?: never; 
>   };
> }[K];
> ```
>
> So, let’s imagine we want to declare the `PaddingOption` type, which declares a `number` field per side: `top`, `right`, `bottom` and `left`. We want the type to allow one side only at once.
>
> ```typescript
> type PaddingOptionKeys = 'top' | 'right' | 'bottom' | 'left';
> type PaddingOptions = { [Key in PaddingOptionKeys]: number };
> type PaddingOption = OneOf<PaddingOptions, PaddingOptionsKeys>;
> 
> const option: PaddingOption = { left: 9 }; // OK
> const option2: PaddingOption = { right: 9 }; // Still OK
> const option3: PaddingOption = { right: 9, left: 0 }; // Throws compilation error
> ```
>
> Isn’t that cool?  
> There are some funny (and useful) types to explore out there. I discovered the `OneOf` type in [this article](https://timhwang21.gitbook.io/index/programming/typescript/xor-type#going-beyond-binary).

### Next steps

*Phew!* So the Git hell is finally done. To be honest, I thought *nodegit* would be totally easier. I’d like to revisit that in the near future and try to understand how Git actually works, learn about Git trees management and so on.  
Besides that, the solution is working: cloning the latest version of the repository, changing some files, creating the commit and pushing it back to the remote wonderfully.

There is no user interaction at the moment, though.

Implementing the user interface as a command-line application is the next step. Some time ago I found this amazing library called [ink](https://github.com/vadimdemedes/ink). This library offers a React development experience but rendering the UI components directly into the console. It provides some pre-built hooks to manage the typical *stdin*, *stdout* and *stderr* channels and the application itself – to kill the current process, which is the only thing it supports for now.

We’ll see how it goes very soon.