<h1 align="center">Waorm.js</h1>
<h3 align="center">Your ORM for JavaScript</h3>

---

Waorm (Web Applications Object-Relational Mapping) is a great way to expand your web applications to work with databases and models.

If you are building Progressive Web Applications (mobile like applications using web) it's a great way to store data and keep your application working even offline.

It's a great addition for applications built using **capacitor.js** (Ionic for example)

## How

Waorm utilizes the IndexedDB by default, creating a simple interface for create models.

`await user().find('email', 'user@example.com')`

Simple calls like these abstract the complex code needed to utilize a complex system like IndexedDB. Makes your code more readable and easier to use. In addition, it provides features like aggregation, inclusive searches, etc.

You can even create and use other database plugins, if you want it to interface with other techologies.

Waorm includes IndexedDB and LocalStorage, though it's certainly recommended to use IndexedDB due to the performance and no "storage limitation".

## Usage

##### Models

Creating a model is easy! It is done by classes to make it easier to manipulate but it's super simple, just follow the example bellow:

```javascript
import { Model } from '@wakit/waorm'

export default class User extends Model {
  storeName(): string {
    return 'users'
  }
}

export const user = () => (new User)
```

We also support typescript so here's an example of a more complex model with relationships, all typed

```typescript
import { Model } from '@wakit/waorm'
import type { Resource, WaormRelationshipBag } from '@wakit/waorm'

import Todo from '~/models/todo'

export interface UserResource extends Resource {
  name: string;
  email: string;
}

export default class User extends Model<UserResource> {
  public name?: string;
  public email?: string;

  relationships(): WaormRelationshipBag {
    return {
      todos: {
        related: Todo,
        relationship: 'many',
        foreignKey: 'user_id',
      },
    }
  }

  storeName(): string {
    return 'users'
  }
}

export const user = () => (new User)
```

#### Database

In order to use your models, you need to set up the database. When initializing, by default, it sets the connection
of all models to that database connection, so you don't need to keep track of your database connection. You can, of course,
use a specific database connection for a specific model.

Here's an example how to setup the database>

```javascript
initDB({
  name: 'MyDatabase',
  // Increment the version every time you do a change on the schema
  version: 1,
  stores: [
    {
      name: 'todos',
      indexes: [
        { name: 'user_id' },
      ],
    },
    {
      name: 'users',
      indexes: [
        { name: 'name' },
        { name: 'email', unique: true },
      ],
    },
  ],
})
```

## Example

Here is an example setup for a simple Todo App

#### JavaScript
```javascript

import { initDB, Model } from '@wakit/waorm'

class Todo extends Model {
  relationships() {
    return {
      user: {
        related: User,
        relationship: 'belongs',
        foreignKey: 'user_id',
      }
    }
  }

  storeName() {
    return 'todos'
  }
}

class User extends Model {
  relationships() {
    return {
      todos: {
        related: Todo,
        relationship: 'many',
        foreignKey: 'user_id',
      },
    }
  }

  storeName() {
    return 'users'
  }
}

const todo = () => (new Todo)
const user = () => (new User)

await initDB({
  name: 'TodoApp',
  version: 1,
  stores: [
    {
      name: 'todos',
      indexes: [
        { name: 'due_by' },
        { name: 'user_id' },
      ],
    },
    {
      name: 'users',
      indexes: [
        { name: 'name' },
        { name: 'email', unique: true },
      ],
    },
  ],
})

///// Using within the application /////

// Get 10 users that name doesn't include 'joao'
console.log(await user().with('todo').many('name', 'joao', { operator: 'not_includes', limit: 10 }))

const myUser = await user().find('email', 'user@example.com')

await todo().hydrate({ name: 'Clean room', due_by: '2025-01-01', user_id: myUser.id }).save()
```
#### TypeScript
```typescript
import { initDB, Model } from '@wakit/waorm'
import type { Resource, WaormRelationshipBag } from '@wakit/waorm'

interface TodoResource extends Resource {
  due_by: string;
  user_id: UserResource['id'];
}

interface UserResource extends Resource {
  name: string;
  email: string;
}

class Todo extends Model<TodoResource> {
  public due_by?: string;

  relationships(): WaormRelationshipBag {
    return {
      user: {
        related: User,
        relationship: 'belongs',
        foreignKey: 'user_id',
      }
    }
  }

  storeName(): string {
    return 'todos'
  }
}

class User extends Model<UserResource> {
  public name?: string;
  public email?: string;

  relationships(): WaormRelationshipBag {
    return {
      todos: {
        related: Todo,
        relationship: 'many',
        foreignKey: 'user_id',
      },
    }
  }

  storeName(): string {
    return 'users'
  }
}

const todo = () => (new Todo)
const user = () => (new User)

await initDB({
  name: 'TodoApp',
  version: 1,
  stores: [
    {
      name: 'todos',
      indexes: [
        { name: 'due_by' },
        { name: 'user_id' },
      ],
    },
    {
      name: 'users',
      indexes: [
        { name: 'name' },
        { name: 'email', unique: true },
      ],
    },
  ],
})

///// Using within the application /////

// Get 10 users that name doesn't include 'joao'
console.log(await user().with('todo').many('name', 'joao', { operator: 'not_includes', limit: 10 }))

const myUser = await user().find('email', 'user@example.com')

await todo().hydrate({ name: 'Clean room', due_by: '2025-01-01', user_id: myUser.id }).save()
```
