>Welcome to **The Peach Speech**.
>
>As the first article in the blog, I’d like to explain what is this blog about.  
>This is basically ~~not~~ my first attempt to start a project able to show off what I like to do and how I do it.  For the last few years – and since I consider myself a software engineer – I wrote a lot of software, code and applications. Most of these were wrote for the company I work for; the rest of them were simply hidden somewhere in my workspace, always private.
>
>This is about sharing content I feel it might be useful – or even fun – to somebody. My goal is to start building something by my own as I always did, but making it public so everyone can see and judge.  
>I’d like to improve my technical skills by writing this blog, as well as communication skills – which I know they are far from being perfect.
>
>That being said, this website is already a project by itself, which I plan to improve along with other projects I’d love to implement in the future.  
>Hopefully, you the reader can take profit of the content by reading or by using any piece of code I publish.  
>I am totally aware that I am not the perfect source of truth and I can be wrong; so please don’t hesitate on contact me when you feel I’m mistaken or I can improve something.

When I was building this website, besides the design and features, the thing I was worried about the most was *how will I publish articles?*. I don’t mean how the user will access those articles – well, you know the answer at this point –, I mean how I will upload the article contents in such a way the website can fetch them.

I think I took a pretty simple solution. The article information and the article itself (its content) will be hosted as a webpage asset. In the assets folder, there’s the `articles.json` file, which contains all the published articles information; and the `articles` folder, that contains all the markdown files. This makes the website a sandbox that contains all the resources it needs to be properly served.  
Having the articles stored somewhere else make the system not so reliable. I thought this solution made sense, wrapping the whole thing as one.

On the other hand, I decided to host the site via [GitHub Pages](https://pages.github.com/). First of all, because it’s **free** – although I don’t expect many users to consume the site (I expect none but me, indeed), I’ve never hosted static files before so I went through the easiest way possible. Anyways, I bet nobody is going to complain about reaching a *GitHub* weird-looking URL at all.  
Hosting on *GitHub Pages* allows me to have a very straightforward deployment pipeline where pushing the site’s built bundle to the `gh-pages` repository branch serves the static files automatically. I added a simple [GitHub workflow](https://github.com/features/actions) which is triggered whenever I push to `master`, builds the Angular web application and automatically pushes the result bundle into the `gh-pages` branch – you can check out the [workflow manifest](https://github.com/VRoxa/thepeachspeech/blob/master/.github/workflows/build-deploy.yml).

The CICD (sort of) aspect is looking good enough, but I still have to add the article markdown file and update the `articles.json` to declare the new article. So, this is what my first article is about: **implementing a tool to automatically upload articles to my blog**.

----

## The Peach Speech tool

The Peach Speech tool (still looking for a better name, tho) is a console application that takes the path of a markdown file as well as its metadata and uploads it automatically to the repository. The application consists of three parts: the user interface, the data collecting and the Git repository handling.

In this article, I want to focus on the Git repository handling. I am going to cover the other two parts somewhere in the future.

[TOC]

### Managing the Git repository

I’ve never managed a Git repository programatically before. After a short search, I found the [nodegit](https://github.com/nodegit/nodegit) library. It seems to be widely used, so I gave it a try.  
My goal is to upload a markdown file and modify the `articles.json` file adding the new article metadata.

#### Setting up

First of all, I need to clone the Git repository from the remote. There are two types of repositories: **non-bare repositories** and **bare repositories**. I will use a bare one, because I’d prefer to deal with trees and tree entries (blobs), rather than a working tree – the actual file structure.

```typescript
// setup.ts
import { Clone, Repository, Remote, FetchOptions } from 'nodegit';
import rimraf from 'rimraf';

export const bareRepositoryPath = './thepeachspeech-bare';
export const repositoryUrl = 'https://github.com/VRoxa/thepeachspeech';

const cleanUpEnvironment = (): Promise<void> => {
  return new Promise(resolve => {
    rimraf(bareRepositoryPath, resolve);
  });
}

const clone = (): Promise<Repository> => {
  return Clone.clone(repositoryUrl, bareRepositoryPath, {
    // Indicates to clone the repository as a bare repository
    bare: 1 // true
  });
}

export const setup = async (): Promise<Repository> => {
  await cleanUpEnvironment();
  await clone();

  const repository = await Repository.open(bareRepositoryPath);
  const remote = await Remote.lookup(repository, 'origin');
  
  const options: FetchOptions = {
    downloadTags: 1,
    prune: 1,
    updateFetchhead: 1
  };
  await remote.fetch(['+refs/*:refs/*'], options, 'Automated');

  return repository;
}
```

Before cloning the repository, I want to make sure the environment is clean, so I use [rimraf](https://www.npmjs.com/package/rimraf) to delete the whole repository folder.  
Cloning the repository is pretty straightforward. Once the repository is cloned, I have to make sure the whole repository is updated with the last version, so I fetch any change on it (I don’t really know if that’s needed, I am just double checking it).

The `setup` function returns the result `Repository` object asynchronously.

#### Accessing the repository files

Before anything else, I created the `FileAccess` class, to abstract any file access into the repository. It uses trees and blobs to read and write from and to the repository.

```typescript
// file-access.ts
import { Repository, Tree } from 'nodegit';

export class FileAccess {

  constructor(private repository: Repository) { }
  
  getContent = async (path: string): Promise<string> => {
    const tree = await this.getTree();
    const fileEntry = await tree.entryByPath(path);
  
    return this.repository
      .getBlob(fileEntry.oid())
      .then(blob => blob.toString());
  }
    
  private getTree = async (): Promise<Tree> => {
    const head = await this.repository.getBranchCommit('master');
    return await head.getTree();
  }
}
```

Reading files from the repository is fairly easy. Assuming we read from the working tree at the *master* branch, we get the latest commit tree from it (`getTree` function). Then, we need to find the tree entry by the given path. At this point, we can assume that the tree entry is a blob (it could be any value from the [`FILEMODE` enum](https://www.nodegit.org/api/tree_entry#FILEMODE)). Having the tree entry, we can get the actual blob object by the tree entry identifier, then read it as `string`.

When it comes to writing, things get a bit more serious.  
My first attempt seemed promising…

```typescript
// file-access.ts
import { Repository, Tree, Treebuilder, Blob, TreeEntry, Oid } from 'nodegit';

export class FileAccess {
  // constructor, getContent and getTree
    
  addOrUpdateFile = async (fullPath: string, content: string): Promise<Oid> => {
    const tree = await this.getTree();
    const builder = await Treebuilder.create(this.repository, tree);

    const buffer = Buffer.from(content, 'utf8');
    const oid = await Blob.createFromBuffer(this.repository, buffer, buffer.length);

    await builder.insert(fullPath, oid, TreeEntry.FILEMODE.BLOB);
    const treeOid = await builder.write();

    return treeOid;
  }
}
```

Getting the *master* branch tree again, we create a `Treebuilder`. The `Treebuilder` instance allows us to modify any given tree.  
We have to create a blob object from a buffer. Then, we just need to insert the blob specifying the path where it will be placed (relative to the root) and write the `Treebuilder`. The `write` function returns the new tree identifier which is going to be used later on.

The version above throws this cryptic error when trying to update the `articles.json` file.

> `Error: failed to insert entry: invalid name for a tree entry - src/assets/articles.json`

Okay, *what went wrong*, then? Well, turns out you cannot insert a blob object with a full path, **it must be a file name**. So, we have to modify the tree of the folder we want to point to. First, let’s write a function that gets the folder tree.

```typescript
// file-access.ts
import { Repository, Tree, Treebuilder, Blob, TreeEntry, Oid } from 'nodegit';

export class FileAccess {
  // constructor, getContent and getTree
  
  private getTreeAt = (folderPath: string, baseTree: Tree) => {
    const getMatchingTree = (treeEntries: TreeEntry[]): Promise<Tree> => { .. }
      
    const treeEntries: TreeEntry[] = [];
    return new Promise<Tree>((resolve, reject) => {
      const walker = baseTree.walk(false);

      walker.on('entry', entry => treeEntries.push(entry));
      walker.on('error', reject);
      walker.on('end', async () => {
        const tree = await getMatchingTree(treeEntries);
        resolve(tree);
      });
  
      walker.start(); 
    });
  }
}
```

We can `walk` through a base tree (the *master* branch tree), getting all the tree entries and collecting them into an array of `TreeEntry`.  
Once the walk ends, we filter all these entries by the folder path.

```typescript
// file-access.ts
import { Repository, Tree, Treebuilder, Blob, TreeEntry, Oid } from 'nodegit';

export class FileAccess {
  // constructor, getContent and getTree
  
  private getTreeAt = (folderPath: string, baseTree: Tree) => {
    const filterTrees = (treeEntries: TreeEntry[]): Promise<Tree[]> => {
      return Promise.all(
        treeEntries
          .filter(entry => entry.isTree())
          .map(entry => entry.getTree())
      );
    }

    const getMatchingTree = async (treeEntries: TreeEntry[]): Promise<Tree> => {
      const trees = await filterTrees(treeEntries);
      const [foundTree] = trees.filter(tree => {
        const treePath = tree.path();
        return treePath === folderPath;
      });
      
      return foundTree;
    }
      
    // walking
  }
}
```

Before anything else, we need to filter the tree entries. Some of them are pointers to blob objects, but I only want to look for actual trees.  
We are now finally able to get the tree which satisfies our folder path.

The `addOrUpdateFile` function barely changes: the full path is split into the folder path and the file name and the `Treebuilder` is now created from the tree we find using the `getTreeAt` function. And, of course, the `insert` function now takes the file name as the first argument – that’s the whole point of the update.

```typescript
import { Repository, Tree, Treebuilder, Blob, TreeEntry, Oid } from 'nodegit';
import path from 'path';

const splitFullPath = (fullPath: string): [string, string] => {
  const folderPath = path.dirname(fullPath);
  const fileName = path.basename(fullPath);
  return [folderPath, fileName];
}

export class FileAccess {
  // constructor, getContent, getTree and getTreeAt
    
  addOrUpdateFile = async (fullPath: string, content: string): Promise<Oid> => {
    const [folderPath, fileName] = splitFullPath(fullPath);

    const tree = await this.getTree();
    const folderTree = await this.getTreeAt(folderPath, tree);
      
    const builder = await Treebuilder.create(this.repository, tree);

    const buffer = Buffer.from(content, 'utf8');
    const oid = await Blob.createFromBuffer(this.repository, buffer, buffer.length);

    // We insert the file by the file name.
    await builder.insert(fileName, oid, TreeEntry.FILEMODE.BLOB);
    const treeOid = await builder.write();

    return treeOid;
  }
}
```

#### Applying changes to the repository

Now that we can manage the repository working tree, let’s implement the `RepositoryManager`. The `RepositoryManager` service will create commits and push them to the remote repository.

The `commit` function takes the identifier of a tree and the commit message. The tree reference we pass in is the tree we previously modified in the `addOrUpdateFile` function. To keep things simple, we assume the commit to be created from the repository HEAD pointing to the *master* branch, with a static signature – representing the author and the committer.

```typescript
// repository-manager.ts
import { Repository, Signature, Oid } from 'nodegit';
import { userName, userEmail } from 'environment';

export class RepositoryManager {
    
  constructor(private repository: Repository) { }
    
  private get signature() {
    return Signature.now(userName, userEmail);
  }
    
  commit = async (tree: Oid, message: string) => {
    const head = await this.repository.getBranchCommit("master");
    return await this.repository.createCommit(
      // The reference that will be updated to point to this new commit
      // For us, we will update the HEAD pointer
      'HEAD',
      // Author
      this.signature,
      // Committer
      this.signature,
      message,
      // The tree that represents the changes to be committed
      tree,
      // The parent commit.
      // For us, the master branch.
      [head]
    );
  }
}
```

The `push` function will get the remote repository reference (`origin`, in our case) and push the changes from the *master* branch pointer.

```typescript
// repository-manager.ts
import { Repository, Signature, Oid, Remote } from 'nodegit';
import { userName, userEmail } from 'environment';

export class RepositoryManager {
    
  // constructor, signature and commit
    
  push = async () => {
    const remote = await Remote.lookup(this.repository, 'origin');
    await remote.push(
      ['refs/heads/master:refs/heads/master']
    );
  }
}
```

The `push` function throws an expected error,

> `[Error: request failed with status code: 401] {`  
>   `errno: -1,`  
>   `errorFunction: 'Remote.push'`  
> `}`

Okay, so we have to provide the credentials to access the repository remotely. The `Remote.push` function expects a second argument, the `PushOptions`, which is used to specify a credentials callback – among many other things.

```typescript
// repository-manager.ts
push = async () => {
  const remote = await Remote.lookup(this.repository, 'origin');
  await remote.push(
    ['refs/heads/master:refs/heads/master'],
    {
      callbacks: {
        certificateCheck: () => 1,
        credentials: (url: string, _: string) => {
          console.log('Trying to authenticate to', url);
          return Cred.sshKeyFromAgent('git');
        }
      }
    }
  );
}
```

Now, the `push` function behaves slightly different, but totally wrong,

> `Trying to authenticate to https://github.com/VRoxa/thepeachspeech`  
> `Trying to authenticate to https://github.com/VRoxa/thepeachspeech`  
> `Trying to authenticate to https://github.com/VRoxa/thepeachspeech`  
> `...`  
> `[Error: too many redirects or authentication replays] {`  
>     `errno: -1,`  
>     `errorFunction: 'Remote.push'`  
> `}`

There are some posts around the web with the very same issue – including *nodegit*, *libgit2*, *LibGit2Sharp*, … – and a [particular one](https://github.com/nodegit/nodegit/issues/511) with a simple statement:

> If you're using `NodeGit.Cred.userpassPlaintextNew` and that's working then you're not using SSH and no SSH key in the world is going to authenticate you into an HTTPS session. Try switching protocols.
>
> **[johnhaley81](https://github.com/johnhaley81)**

Well, in my case, trying `Cred.userpassPlaintextNew` with my actual GitHub username and password didn’t work. However, I was previously trying to authenticate via SSH, while opening the repository via HTTPS. So I gave SSH another try authenticating with the SSH key this time.  
I generated both public and private keys and I stored them in a `keys` folder.

```typescript
// credentials.ts
import { Cred, RemoteCallbacks } from 'nodegit';
import { join } from 'path';

const sshPublicKeyPath = join(__dirname, '../../keys/id_rsa.pub');
const sshPrivateKeyPath = join(__dirname, '../../keys/id_rsa');

const getCredentials = (): Cred => {
  return Cred.sshKeyNew(
    'git',
    sshPublicKeyPath,
    sshPrivateKeyPath,
    '' // no passphrase
  );
}

export const getCredentialsCallbacks = (): RemoteCallbacks => {
  return  {
    certificateCheck: () => 1,
    credentials: getCredentials
  }
}
```

> By the way, *nodegit* – its underlying libraries, indeed – does not support the OpenSSH private key format, which is the format OpenSSH ≥7.8 generates by default. I had to generate the keys using the PEM format, `ssh-keygen -m PEM -C <your_mail@example.com>`.  
> Thanks to [this post](https://github.com/nodegit/nodegit/issues/1606) for the hint.

Having a way to provide my credentials, I can now modify the `clone`, `fetch` and `push` functions with them.

```typescript
// setup.ts
const clone = (): Promise<Repository> => {
  return Clone.clone(repositoryUrl, bareRepositoryPath, { 
    bare: 1,
    fetchOpts: {
      callbacks: getCredentialsCallbacks()
    }
  });
}

export const setup = async (): Promise<Repository> => {
  // clean, clone and lookup
  
  const options: FetchOptions = {
    downloadTags: 1,
    prune: 1,
    updateFetchhead: 1,
    callbacks: getCredentialsCallbacks()
  };
  await remote.fetch(['+refs/*:refs/*'], options, 'Automated');

  // return
}

// repository-manager.ts
push = async () => {
  const remote = await Remote.lookup(this.repository, 'origin');
  await remote.push(['refs/heads/master:refs/heads/master'], {
    callbacks: getCredentialsCallbacks()
  });
}
```

And, of course, the `repositoryUrl` now has to change to the SSH version `git@github.com:VRoxa/thepeachspeech.git`.  
Seems alright… But a bitter truth awaits.

### Stepping back - (un)Realizing how Git trees work

Let’s get back to the `commit` function. The `commit` function was creating a commit using the tree’s `Oid` returned by the `addOrUpdateFile` function, which represents the changes to commit. It felt okay to me. Well, it’s very far from being okay.  
Taking a closer look to the created commit, it has the modified (or created) file; good. However, it removes the rest of the files in the working tree. In my understanding, the returned tree has only the change we made, ignoring every other file – because we just retrieved the tree at the target folder. This results in the removal of the rest of the files in the *diff*.

After searching and trying, I found nothing. The documentation doesn’t help that much.  
Using the “base tree” (`const tree = await this.repository.getBranchCommit('master').then(head => head.getTree());`) everything is working, but we’ve just seen how we can only insert a blob as a file name (I am sure this has to have an easy fix, but it’s totally undocumented).  
Using the folder tree to bulk the changes and committing the “base tree” results in an empty commit (without any change), unsusprisingly.

#### A bitter conclusion

I have to simplify the solution a bit – rather that trying to understand the *ins* and *outs* of Git as if I was Linus Torvalds.

Starting by cloning the repository remotely as a non-bare repository allows me to read and write files like a normal human being. With the standard Node’s file system, this task is really trivial.  
Once the `addOrUpdateFile` is done, I still need a tree representing the current working tree with those changes. Using the “base tree” as it is produces the exact same result: **an empty commit**.

I am thinking of switching to another tool to manage all *offline* (local) changes.  
There are some alternatives out there, and [simple-git](https://github.com/steveukx/git-js) seems promising…

Git is not a joke.