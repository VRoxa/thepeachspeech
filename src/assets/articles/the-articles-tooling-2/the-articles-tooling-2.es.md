Recientemente he intentado implementar mi propia herramienta para subir artículos más fácilmente. Ya expliqué cómo fue la aventura en [mi último artículo](https://vroxa.github.io/thepeachspeech/es/article/the-articles-tooling) – *spoiler*: no demasiado bien. Me di cuenta de lo frustrante que era trabajar con *nodegit*, así que he cambiado a otra librería de Git. Aún así, conseguí conectarme a GitHub para clonar, hacer *fetch* y *push* autenticando las llamadas con claves SSH; de modo que aún quiero usar esa parte.

### La solución final de Git

Quiero recopilar todo aquél código que funcione de la última sesión y ponerlo todo junto en un servicio. Este servicio va a gestionar todo el acceso remoto al repositorio y, por tanto, se llamará `RepositoryManager`. Se trata de un *singleton* en mi aplicación, que será inicializado cuando la aplicación arranque.  
La función `setup` ahora inicializará el `RepositoryManager` después de limpiar la carpeta local del repositorio, clonará el repositorio y hará *`fetch`* the de los últimos cambios.

```typescript
// setup.ts
const cleanUpEnvironment = (): Promise<void> => {
  return new Promise(resolve => {
    rimraf(env.repositoryPath, resolve);
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

He sacado algunas variables de entorno fuera para que puedan ser compartidas en toda la aplicación, como si fuera el típico objeto de entorno de Angular.

```typescript
// environment.ts
import { join } from 'path';

export default {
  repositoryUrl: 'git@github.com:VRoxa/test-nodegit.git',
  repositoryPath: join(__dirname, '../../repository'),
  keysPath: join(__dirname, '../../keys')
}
```

Ya que `RepositoryManager` es un *singleton*, guardará la referencia al repositorio internamente una vez esté clonado.  
Creo que está totalmente justificado, aunque el gestor (*manager*) sea un *singleton*, cada gestor debería tener su propio repositorio creado (sin exponerlo hacia fuera); teniendo una relación 1:1.

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

La función `getCredentialsCallback` es exactamente la misma que ya tenía anteriormente. El único cambio aplicado es que ahora obtiene la ruta a la carpeta donde están las claves SSH del objeto de entorno.

#### Hacer *commit* de los cambios

Como se puede ver, el `RepositoryManager` no tiene ninguna función `commit`. Me encantaría que tuviese una, pero eso es exactamente lo que intenté antes y fracasé en el proceso.  
Decidí hacerlo sencillo, de modo que busqué alternativas a *nodegit* hasta que encontré la librería [simple-git](https://github.com/steveukx/git-js). La librería *simple-git* envuelve los comandos Git de una forma **simple**, lo que los hace muy sencillos de trabajar.

Las opciones de la función `clone` del `RepositoryManager` especifican que se clone el repositorio como un ***non-bare repository***, así que descarga todos los ficheros del repositorio, así como la carpeta *.git*. Tener los ficheros con el código fuente hace las cosas mucho más sencillas de tratar.

He implementado la función `createCommit` usando *simple-git* que toma un mensaje de *commit*, guarda cualquier cambio en el repositorio y crea un *commit*. Suficientemente simple.

```typescript
// create-commit.ts
import environment from '../../environment/environment';
import git from 'simple-git';


export const createCommit = async (message: string) => {
  // Configura la instancia del repositorio en la ruta.
  const repository = git(environment.repositoryPath);
    
  // Guarda cuandlquier cambio
  await repository.add('./*');
  // Crea el commit
  await repository.commit(message);
}
```

### Accesdiendo a los ficheros del repositorio

Como he dicho, descarté la idea de trabajar con *blobs* y árboles. Suena muy elegante y excitante, pero no quiero quedarme calvo intentando explorar estos temas tan confusos (¿aún?). Acceder a los ficheros es tan sencillo como usar cualquier operación CRUD sobre los ficheros usando el módulo `fs` de Node.

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

Ahora ya puedo usar la clase `FileAccess` para implementar el `ArticlesService`. El `ArticlesService` implementa las operaciones CRUD sobre los artículos siguiendo el patrón repositorio (más o menos) pero apuntando a los ficheros en vez de una base de datos – podría ser renombrado a `ArticlesRepository`, pero ya hay otro concepto de “repositorio” es mi dominio, así que prefiero el término “servicio”, aquí.

El modelo `Article` ha sido extraido del [repositorio de la web](https://github.com/VRoxa/thepeachspeech). Éste es un “vínculo” entre los dos proyectos y definitivamente debe ser el mismo modelo.  
He introducido el modelo `ArticleDto`, que incluye la propiedad `filePath`. El `ArticleDto` es específico para este proyecto y será la representación de un artículo en creación. Puedes echar un ojo a ambos modelos en el [código fuente](https://github.com/VRoxa/thepeachspeech-tool/blob/master/src/models/article.model.ts).

> Ya que el modelo `Article` se comparte entre el proyecto de Angular y la herramienta, podría perfectamente extraer esa definición en un módulo compartido al que ambos proyectos hagan referencia. En mi caso, esto no me preocupa demasiado. Sólo es un modelo pequeñísimo y que no va a cambiar tanto.  
> Esto es algo que sí haría si se tratase de dominio mucho más complejo, por supuesto.

He aplicado lógica concreta de los artículos en el `ArticlesService`.  
Aunque el servicio no sea muy interesante de ver, he aprovechado la ocasión para jugar un poco con los tipos de utilidad de Typescript. Verás, el modelo `Article` tiene el campo `date`, que es de tipo `Date`. El fichero JSON de dónde se leen los artículos devuelve una colección de objetos que incluyen el campo `date` como un `string`. He declarado el tipo `RawArticle` que sobreescribe el campo `date` como un `string`. El servicio lee el fichero como una colección de `RawArticle` y *mapea* cada elemento a un `Article`. 

```typescript
// articles-service.ts

type RawArticle = Omit<Article, 'date'> & { date: string };

export class ArticlesService {
    
  constructor(private fileAccess: FileAccess) { }
    
  getAll = async (): Promise<Article[]> => {
      
    // El articlesJsonFilePath es la ruta del fichero en el respositorio clonado
    const articlesJson = await this.fileAccess.getContent(articlesJsonFilePath);
    const articles: RawArticle[] = JSON.parse(articlesJson);
    return articles.map(article => {
      ...article,
      date: new Date(article.date)
    });
  }

  // funciones add, update, delete
}
```

> Los tipos de utilidad ([*utility types*](https://www.typescriptlang.org/docs/handbook/utility-types.html)) son la funcionalidad de Typescript que más me gusta, sin duda. Son algo que siempre intento añadir cuando es necesario (incluso creo que tiendo a forzarme a mí mismo a usarlos a veces, incluso cuando no son estrictamente necesarios, sólo por diversión).
>
> El sistema de tipos de Typescript puede explotarse mucho con los tipos de utilidad (y otras funcionalidades relacionadas con los tipos) para conseguir soluciones alucinantes. Por ejemplo, el tipo `OneOf`, que resulta en un tipo donde sólo una propiedad de un tipo base es permitida.
>
> ```typescript
> type OneOf<T, K extends keyof T> = {
> [Key in K]: Pick<Required<T>, Key> & { 
>  [InnerKey in Exclude<K, Key>]?: never; 
> };
> }[K];
> ```
>
> Imaginemos que queremos declarar el tipo `PaddingOption`, que declara un campo de tipo `number` por lado: `top` (lado superior), `right` (lado derecho), `bottom` (lado inferior) y `left` (lado izquierdo). Queremos que el tipo sólo permita un lado a la vez.
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
> Hay algunos tipos muy divertidos (y útiles) que vale la pena explorar.  
> Descubrí el tipo `OneOf` en [este artículo](https://timhwang21.gitbook.io/index/programming/typescript/xor-type#going-beyond-binary).

### Siguientes pasos

*¡Buf!* Al final, el infierno de Git está hecho. Siendo honesto, pensé que *nodegit* sería mucho más fácil. Me gustaría revisitarlo en un futuro e intentar entender cómo trabaja Git y aprender sobre la gestión de los árboles de Git y demás.  
A parte de eso, la solución funciona: clonar la última versión del repositorio, cambiar algunos ficheros, crear un *commit* y hacer *push* al repositorio remoto.

De todos modos, no hay ninguna interfaz de usuario, de momento.

El siguiente paso es implementar la interfaz de usuario como una aplicaciónd de consola. Hace un tiempo encontré una librería increíble llamada [ink](https://github.com/vadimdemedes/ink). Esta librería ofrece una experiencia de desarrollo con React, pero renderizando los componentes de la UI directamente en la consola. Provee algunos *hooks* para gestionar los típìcos canales *stdin*, *stdout* y *stderr* y la aplicación en sí misma – para matar el proceso actual, lo cual es lo único que soporta por ahora.

Veremos cómo va muy pronto.