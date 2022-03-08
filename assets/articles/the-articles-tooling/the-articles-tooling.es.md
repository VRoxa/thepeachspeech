>Bienvenidxs a **The Peach Speech** (*el discurso del melocotón*, no suena tan bien es español).
>
>Siendo éste el primer artículo del *blog*, me gustaría explicar de qué va.  
>Básicamente, este ~~no~~ es mi primer intento de empezar un proyecto que pueda enseñar lo que me gusta hacer y cómo lo hago. En los últimos años – y des de que me considero *software engineer* – he escrito mucho *software*, código y aplicaciones. La mayoría de ellas fueron escritas para la compañía por la que trabajo y el resto simplemente están escondidas en algún lugar, siempre privadas.
>
>Este *blog* pretende compartir contenido que creo que podría ser útil – o incluso entretenido – para alguien. Mi objetivo es empezar a construir algo por mi cuenta, como siempre he hecho, pero haciéndolo público de manera que cualquiera pueda verlo y juzgarlo.  
>My gustaría ir mejorando mis habilidades y conocimientos escribiendo este *blog*, así como mi expresión escrita – que soy plenamente consciente que está lejos de ser perfecta.
>
>Dicho esto, esta *web* ya es un proyecto por sí mismo en el que planeo ir mejorando junto con otros proyectos que me encantaría implementar en un futuro.  
>Espero que tú, como lector, podrás sacar provecho del contenido leyendo o usando cualquier trozo de código que publique.  
>Soy totalmente consciente de que no soy una perfecta fuente de verdad y puedo estar equivocado; así que no dudes en contactamente cuando creas que no tenga razón o que puedo mejorar algo.

Cuando estaba desarrollando esta *web*, a parte del diseño y las funcionalidades, lo que más me preocupaba era *¿cómo voy a publicar los artículos?*. No me refiero cómo el usuario tendrá acceso a esos artículos – bueno, ya conoces la respuesta a eso, ahora –, me refiero a cómo voy a subir el contenido de los artículos de manera que la *web* pueda descargarlo.

Creo que tomé una decisión bastante sencilla. La información del artículo y el contenido del mismo está servido como un recurso de la *web* (*webpage asset*). En la carpeta de *assets*, se encuentra el fichero `articles.json`, que contiene toda la información de los artículos publicados; y la carpeta `articles`, que contiene los ficheros de *markdown*. Esto hace que la *web* sea una cápsula que contiene todos los recursos que necesita para servirse correctamente.  
Tener esos artículos guardados en cualquier otro lado no genera tanta confianza en el sistema. A mi parecer, esta solución tiene sentido, agrupándolo todo en uno.

Por otro lado, decidí servir la *web* con [GitHub Pages](https://pages.github.com/). En primer lugar porque es **gratuito** – aunque no espero demasiados usuarios consumiendo la *web* (no espero ninguno, de hecho), nunca antes he servido ficheros estáticos así que fui con la solución más sencilla posible. De todas formas, no creo que nadie se vaya a quejar por entrar a una URL rara de *GitHub*.  
Servir en *GitHub Pages* me permite tener una *pipeline* de despliegue muy simple donde haciendo *push* del resultado de la compilación de la *web* en la rama `gh-ages` del repositorio sirve automáticamente todos los ficheros estáticos. Añadí un sencillo [GitHub workflow](https://github.com/features/actions) que es ejecutado cada vez que hago *push* en la rama `master`. Este *workflow* hace la compilación de la aplicación *web* de Angular y hace un *push* del resultado en la rama `gh-pages` de forma automática – puedes ver el [workflow](https://github.com/VRoxa/thepeachspeech/blob/master/.github/workflows/build-deploy.yml) (*manifest*).

Al aspecto CICD (más o menos) se ve bastante bien, pero aún tengo que añadir el fichero *markdown* del artículo y actualizar el `articles.json` para declarar un nuevo artículo. De modo que de esto se trata mi primer artículo: **implementar una herramienta para subir artículos a mi *blog* automáticamente**.

----

## La Peach Speech *tool*

La Peach Speech *tool* (aún sigo buscando un nombre mejor) es una aplicación de consola que toma la ruta de un fichero *markdown*, así como su *metadata* y lo sube automáticamente al repositorio. La aplicación consiste en tres partes: la interfaz de usuario, la recolección de datos y el tratamiento del repositorio de Git.

En este artículo, quiero enfocarme en el tratamiento del repositorio de Git. Voy a cubrir las otras dos partes en un futuro.

[TOC]

### Gestionando el repositorio de Git

Nunca antes había hecho una programa que gestione un repositorio de Git. Después de una búsqueda rápida, encontré la librería [nodegit](https://github.com/nodegit/nodegit). Parece estar bastante extendida, así que le di una oportunidad.  
Mi objetivo es subir un fichero *markdown* y modificar el fichero `articles.json` añadiendo la nueva información del artículo.

#### Montando el entorno

Necesito clonar el repositorio de Git del remoto en primer lugar. Hay dos tipos de repositorios: ***bare repositories*** y ***non-bare repositories***. Voy a usar el primero porque me gustaría tratar con árboles y entradas de árboles (*blobs*) en vez de tratar con el árbol de ficheros.

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

Antes de clonar el repositorio, quiero asegurarme de que el entorno está limpio; para ello uso [rimraf](https://www.npmjs.com/package/rimraf) para borrar la carpeta del repositorio completamente.  
Clonar el repositorio es bastante fácil. Una vez el repositorio está clonado, actualizo el repositorio con la última versión, así que descargo cualquier cambio en él (no estoy seguro de si este paso es estrictamente necesario).

La función `setup` retorna el objeto `Repository` asíncronamente.

#### Accediendo a los ficheros del repositorio

Antes que nada, me creo la clase `FileAccess`, para abstraer cualquier acceso a los ficheros del repositorio. Ésta clase usa árboles y *blobs* para leer del repositorio y escribir en él.

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

Leer ficheros del repositorio es bastante fácil. Asumiendo que leemos del árbol de trabajo en la rama *master*, sacamos el árbol de ahí (función `getTree`). Entonces tenemos que encontrar una entrada en el árbol por la ruta que nos dan. En este punto podemos asumir que la entrada del árbol es un *blob* (podría ser cualquier otro valor del [enum `FILEMODE`](https://www.nodegit.org/api/tree_entry#FILEMODE)). Teniendo la entrada, podemos sacar el objeto *blob* por el identificador de la entrada y leerlo como un `string`.

Cuando se trata de escritura, las cosas se ponen un poco más serias.  
Mi primer intento parecía premetedor…

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

Sacando el árbol de la rama *master* otra vez, creamos un `Treebuilder`. La intancia de `Treebuilder` nos permite modificar cualquier árbol.  
Tenemos que crear un objeto *blob* con un *buffer*, insertar el *blob* especificando a qué ruta debe ir (relativa des de la raíz) y escribir en el `Treebuilder`. La función `write` devolverá el nuevo identificador del árbol, que usaremos más adelante.

La versión de arriba lanza un error críptico cuando tratamos de actualizar el fichero `articles.json`.

> `Error: failed to insert entry: invalid name for a tree entry - src/assets/articles.json`  
> *Error: fallo al insertar la entrada: nombre inválido para una entrada de árbol - src/assets/articles.json*

Vale, entonces, ¿qué ha ido mal? Bueno, parece ser que no puedes insertar un objeto *blob* con una ruta entera, tiene que ser un nombre de fichero. Así que tenemos que modificar el árbol de la carpeta a la que queremos apuntar. Primero, vamos a escribir una función que devuelva el árbol de la carpeta.

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

Podemos *pasear* (`walk`) a través del árbol base (el árbol de la rama *master*), obteniendo todas las entradas de árbol y coleccionándolas en una lista de `TreeEntry`.  
Una vez el paseo termina, filtramos estas entradas por la ruta de la carpeta.

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

Algunas de estas entradas son objetos *blob*, pero nosotros solo queremos buscar los árboles reales; así que debemos filtrar las entradas antes que nada.  
Con este cambio ya podemos sacar el árbol que está en la ruta de nuestra carpeta.

La función `addOrUpdateFile` cambia solo un poco: la ruta se ha dividido en la ruta de la carpeta y el nombre del fichero, y el `Treebuilder` se crea ahora des del árbol que encontramos usando la función `getTreeAt`. Y, por supuesto, la función `insert` toma ahora el nombre del fichero como primer argumento – de eso se trataba el cambio, a fin de cuentas.

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

#### Aplicando los cambios al repositorio

Ahora que somos capaces de gestionar el árbol de trabajo del repositorio, vamos a implementar el `RepositoryManager`. El servicio `RepositoryManager` creará *commits* y hará *push* al repositorio remoto.

La función `commit` toma un identificador de un árbol y el mensaje del *commit*. La referencia del árbol que pasamos es la que obtenemos como resultado de invocar la función `addOrUpdateFile`. Para simplificar, podemos asumir que el *commit* será creado des el *HEAD* del repositorio que apunta a la rama *master*, con una firma estática que representa el autor y el *committer* (aquél que crea el *commit*).

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
      // La referencia que será actualizada para apuntar al nuevo commit.
      // Para nosotros, actualizaremos el puntero HEAD
      'HEAD',
      // Autor
      this.signature,
      // Committer
      this.signature,
      message,
      // El árbol que representa los cambios
      tree,
      // El commit padre.
      // Para nosotros, es la rama master.
      [head]
    );
  }
}
```

La función `push` obtendrá la referencia al repositorio remoto (`origin`, en nuestro caso) y hará *push* de los cambios des del puntero de la rama *master*.

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

Como era de esperar, la función `push` lanza este error:

> `[Error: request failed with status code: 401] {
> errno: -1,
> errorFunction: 'Remote.push'
> }`  
> *Error: la petición ha fallado con código de estado: 401*

Muy bien, de modo que tenemos que proveer las credenciales de acceso al repositorio remoto. La función `Remote.push` asume un segundo argumento, las `PushOptions`. Ahí podemos especificar una *callback* de credenciales.

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

Ahora la función `push` se comporta un poco diferente, pero totalmente mal,

> `Trying to authenticate to https://github.com/VRoxa/thepeachspeech
> Trying to authenticate to https://github.com/VRoxa/thepeachspeech
> Trying to authenticate to https://github.com/VRoxa/thepeachspeech
> ...
> [Error: too many redirects or authentication replays] {
> errno: -1,
> errorFunction: 'Remote.push'
> }`  
> *Intentando autenticarse a https://github.com/VRoxa/thepeachspeech*  
> *Error: demasiadas redirecciones o reintentos de autenticación*

Hay algunos artículos describiendo el mismo problema – incluyendo *nodegit*, *libgit2*, *LibGit2Sharp*, … – y [uno en particular](https://github.com/nodegit/nodegit/issues/511) con una explicación simple:

>Si estás usando `NodeGit.Cred.userpassPlaintextNew` y no está funcionando, entonces no estás usando SSH y ninguna clave SSH del mundo va a autenticarte en la sesión de HTTPS. Intenta cambiar de protocolo.
>
>**[johnhaley81](https://github.com/johnhaley81)**

Bueno, en mi caso, usar la función `Cred.userpassPlaintextNew` con mi usuario y contraseña de GitHub no funcionó. De todas formas, antes estaba intentando autenticarme con SSH mientras abría el repositorio con HTTPS. Así que le di otra oportunidad a SSH, esta vez con las claves SSH.  
Generé las claves (una pública y otra privada) y las guardé en la carpeta `keys`.

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

> Por cierto, *nodegit* – sus librerías internas, de hecho – no soporta el formato de clave OpenSSH, que es el formato que OpenSSH ≥7.8 genera por defecto. Tuve que generar las claves usando el formato PEM, `ssh-keygen -m PEM -C <your_mail@example.com>`.  
> Gracias a [este comenario](https://github.com/nodegit/nodegit/issues/1606) por la pista.

Teniendo una forma de proveer mis credenciales, ahora puedo modificar las funciones `clone`, `fetch` y `push` con ellas.

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

Además, el valor de `repositoryUrl` tiene que cambiar a su versión SSH, `git@github.com:VRoxa/thepeachspeech.git`.  
Parece bastante correcto… Pero una verdad amarga me espera.

### Un paso atrás – (No) Dándome cuenta de cómo funcionan los árboles de Git

Volvamos un segundo a la función `commit`. La función `commit` estaba creando un *commit* usando el `Oid` (identificador) del árbol que retorna la función `addOrUpdateFile`, que representa los cambios hechos. A mí me parecía correcto. Bueno, está muy lejos de estar correcto.  
Fijándome bien en el *commit* creado, tiene el fichero modificado (o creado), bien; pero borra el resto de ficheros en el árbol de trabajo. Por lo que entiendo, el árbol que ha sido devuelto sólo tiene los cambios que hemos hecho, ignorando todos los demás ficheros – porque sólo hemos devuelto el árbol de la ruta de la carpeta. Esto resulta en que todos los otros ficheros están borrados en el *diff*.

Después de un buen rato probando y buscando no llegué a nada. La documentación tampoco ayuda demasiado.  
Usando el “*árbol base*” (`const tree = this.repository.getBranchCommit('master').then(head => head.getTree());`) “todo” funciona, pero ya hemos visto como es sólo podemos insertar un *blob* con el nombre del fichero (estoy convencido de que esto tiene fácil arreglo, pero está totalmente indocumentado).  
Volcando los cambios en el árbol de la carpeta y creando un *commit* des del “*árbol base*” resulta en un *commit* vacío, sin ningún cambio.

#### Una conclusión amarga

Tengo que simplificar un poco la solución – en vez de tratar de entender las entrañas de Git como si yo fuera Linus Torvalds.

Clonar el repositorio remoto como un *non-bare repository* me permite leer y escribir ficheros como un ser humano normal. Con el sistema de ficheros de Node, esto es una tarea trivial.  
Una vez la función `addOrUpdateFile` esté modificada, Aún necesito un árbol que represente esos cambios. Usando el “*árbol base*” como tal produce el mismo resultado: un *commit* vacío.

Estoy pensando en cambiar a otra herramienta para gestionar todos los cambios en local.  
Hay algunas alternativas; por ejemplo, [simple-git](https://github.com/steveukx/git-js) parece prometedora.

Git no es ningún juego.