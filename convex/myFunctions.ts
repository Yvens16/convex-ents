import { customCtx, customQuery } from "convex-helpers/server/customFunctions";
import {
  DocumentByName,
  FieldTypeFromFieldPath,
  GenericDataModel,
  GenericDatabaseReader,
  GenericIndexFields,
  GenericQueryCtx,
  GenericTableIndexes,
  IndexNames,
  Indexes,
  NamedIndex,
  NamedTableInfo,
  Query,
  TableNamesInDataModel,
} from "convex/server";
import { GenericId } from "convex/values";
import { query as baseQuery, mutation } from "./_generated/server";
import { Doc, TableNames } from "./_generated/dataModel";
import { EdgeConfig, Expand, GenericEntsDataModel } from "./ents/schema";
import { entDefinitions } from "./schema";

type FieldTypes<
  DataModel extends GenericDataModel,
  Table extends TableNamesInDataModel<DataModel>,
  T extends string[]
> = {
  [K in keyof T]: FieldTypeFromFieldPath<
    DocumentByName<DataModel, Table>,
    T[K]
  >;
};

class QueryQueryPromise<
  DataModel extends GenericDataModel,
  EntsDataModel extends GenericEntsDataModel<DataModel>,
  Table extends TableNamesInDataModel<DataModel>
> extends Promise<EntByName<DataModel, Table>[] | null> {
  constructor(
    protected ctx: GenericQueryCtx<DataModel>,
    protected entDefinitions: EntsDataModel,
    protected table: Table,
    protected retrieve: (
      db: GenericDatabaseReader<DataModel>
    ) => Promise<Query<NamedTableInfo<DataModel, Table>> | null>
  ) {
    super(() => {});
  }

  first(): QueryOnePromise<DataModel, EntsDataModel, Table> {
    return new QueryOnePromise(
      this.ctx,
      this.entDefinitions,
      this.table,
      async (db) => {
        const query = await this.retrieve(db);
        if (query === null) {
          return null;
        }
        return query
          .first()
          .then((doc) => (doc === null ? null : entWrapper(doc, this.table)));
      }
    );
  }

  then<TResult1 = EntByName<DataModel, Table>[] | null, TResult2 = never>(
    onfulfilled?:
      | ((
          value: EntByName<DataModel, Table>[] | null
        ) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return this.retrieve(this.ctx.db)
      .then((query) => (query === null ? null : query.collect()))
      .then((documents) =>
        documents === null
          ? null
          : documents.map((doc) => entWrapper(doc, this.table))
      )
      .then(onfulfilled, onrejected);
  }
}

class QueryPromise<
  DataModel extends GenericDataModel,
  EntsDataModel extends GenericEntsDataModel<DataModel>,
  Table extends TableNamesInDataModel<DataModel>
> extends QueryQueryPromise<DataModel, EntsDataModel, Table> {
  constructor(
    ctx: GenericQueryCtx<DataModel>,
    entDefinitions: EntsDataModel,
    table: Table
  ) {
    super(ctx, entDefinitions, table, async (db) => db.query(table));
  }

  get<
    Indexes extends DataModel[Table]["indexes"],
    Index extends keyof Indexes,
    IndexTypes extends string[] = Indexes[Index]
  >(
    indexName: Index,
    ...values: FieldTypes<DataModel, Table, IndexTypes>
  ): QueryOnePromise<DataModel, EntsDataModel, Table>;
  get(id: GenericId<Table>): QueryOnePromise<DataModel, EntsDataModel, Table>;
  get(...args: any[]) {
    return new QueryOnePromise(
      this.ctx,
      this.entDefinitions,
      this.table,
      args.length === 1
        ? (db) => {
            const id = args[0] as GenericId<Table>;
            if (this.ctx.db.normalizeId(this.table, id) === null) {
              return Promise.reject(
                new Error(`Invalid id \`${id}\` for table "${this.table}"`)
              );
            }
            return db
              .get(id)
              .then((doc) =>
                doc === null ? null : entWrapper(doc, this.table)
              );
          }
        : (db) => {
            const [indexName, value] = args;
            return db
              .query(this.table)
              .withIndex(indexName, (q) => q.eq(indexName, value))
              .unique()
              .then((doc) =>
                doc === null ? null : entWrapper(doc, this.table)
              );
          }
    );
  }

  then<TResult1 = EntByName<DataModel, Table>[], TResult2 = never>(
    onfulfilled?:
      | ((
          value: EntByName<DataModel, Table>[]
        ) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return super.then(onfulfilled as any, onrejected);
  }
}

// This query materializes objects, so chaining to this type of query performs one operation for each
// retrieved document in JavaScript, basically as if using
// `Promise.all()`.
class QueryMultiplePromise<
  DataModel extends GenericDataModel,
  EntsDataModel extends GenericEntsDataModel<DataModel>,
  Table extends TableNamesInDataModel<DataModel>
> extends Promise<EntByName<DataModel, Table>[] | null> {
  constructor(
    private ctx: GenericQueryCtx<DataModel>,
    private entDefinitions: EntsDataModel,
    private table: Table,
    private retrieve: (
      db: GenericDatabaseReader<DataModel>
    ) => Promise<DocumentByName<DataModel, Table>[] | null>
  ) {
    super(() => {});
  }

  then<TResult1 = EntByName<DataModel, Table>[], TResult2 = never>(
    onfulfilled?:
      | ((
          value: EntByName<DataModel, Table>[] | null
        ) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return this.retrieve(this.ctx.db)
      .then((docs) =>
        docs === null ? null : docs.map((doc) => entWrapper(doc, this.table))
      )
      .then(onfulfilled, onrejected);
  }
}

class QueryOnePromise<
  DataModel extends GenericDataModel,
  EntsDataModel extends GenericEntsDataModel<DataModel>,
  Table extends TableNamesInDataModel<DataModel>
> extends Promise<EntByName<DataModel, Table> | null> {
  constructor(
    private ctx: GenericQueryCtx<DataModel>,
    private entDefinitions: EntsDataModel,
    private table: Table,
    private retrieve: (
      db: GenericDatabaseReader<DataModel>
    ) => Promise<DocumentByName<DataModel, Table> | null>
  ) {
    super(() => {});
  }

  then<TResult1 = EntByName<DataModel, Table> | null, TResult2 = never>(
    onfulfilled?:
      | ((
          value: EntByName<DataModel, Table> | null
        ) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return this.retrieve(this.ctx.db)
      .then((doc) => (doc === null ? null : entWrapper(doc, this.table)))
      .then(onfulfilled, onrejected);
  }

  edge<Edge extends keyof EntsDataModel[Table]["edges"]>(
    edge: Edge
  ): EntsDataModel[Table]["edges"][Edge]["cardinality"] extends "multiple"
    ? QueryMultiplePromise<
        DataModel,
        EntsDataModel,
        EntsDataModel[Table]["edges"][Edge]["to"]
      >
    : QueryOnePromise<
        DataModel,
        EntsDataModel,
        EntsDataModel[Table]["edges"][Edge]["to"]
      > {
    const edgeDefinition: EdgeConfig = (
      this.entDefinitions[this.table].edges as any
    ).filter(({ name }: EdgeConfig) => name === edge)[0];

    if (edgeDefinition.cardinality === "multiple") {
      if (edgeDefinition.type === "ref") {
        return new QueryMultiplePromise(
          this.ctx,
          this.entDefinitions,
          edgeDefinition.to,
          async (db) => {
            const doc = await this.retrieve(db);
            if (doc === null) {
              return null;
            }
            const edgeDocs = await db
              .query(edgeDefinition.table)
              .withIndex(edgeDefinition.field, (q) =>
                q.eq(edgeDefinition.field, doc._id as any)
              )
              .collect();
            return (
              await Promise.all(
                edgeDocs.map((edgeDoc) =>
                  db.get(edgeDoc[edgeDefinition.ref] as any)
                )
              )
            ).filter(<TValue>(doc: TValue | null, i: number): doc is TValue => {
              if (doc === null) {
                throw new Error(
                  `Dangling reference "${
                    edgeDocs[i][edgeDefinition.field] as string
                  }" found in document with _id "${
                    edgeDocs[i]._id as string
                  }", expected to find a document with the first ID.`
                );
              }
              return true;
            });
          }
        ) as any;
      }
      return new QueryQueryPromise(
        this.ctx,
        this.entDefinitions,
        edgeDefinition.to,
        async (db) => {
          const doc = await this.retrieve(db);
          if (doc === null) {
            return null;
          }
          return db
            .query(edgeDefinition.to)
            .withIndex(edgeDefinition.ref, (q) =>
              q.eq(edgeDefinition.ref, doc._id as any)
            );
        }
      ) as any;
    }

    return new QueryOnePromise(
      this.ctx,
      this.entDefinitions,
      edgeDefinition.to,
      async (db) => {
        const doc = await this.retrieve(db);
        if (doc === null) {
          return null;
        }

        if (edgeDefinition.type === "ref") {
          const inverseEdgeDefinition: EdgeConfig = (
            this.entDefinitions[edgeDefinition.to].edges as any
          ).filter(({ to }: EdgeConfig) => to === this.table)[0];
          if (inverseEdgeDefinition.type !== "field") {
            throw new Error(
              `Unexpected inverse edge type for edge: ${edgeDefinition.name}, ` +
                `expected field, got ${inverseEdgeDefinition.type} ` +
                `named ${inverseEdgeDefinition.name}`
            );
          }

          const other = await this.ctx.db
            .query(edgeDefinition.to)
            .withIndex(edgeDefinition.ref, (q) =>
              q.eq(edgeDefinition.ref, doc._id as any)
            )
            .unique();
          if (other === null) {
            return null;
          }
          return entWrapper(other, edgeDefinition.to);
        }

        // if (edgeDefinition.type !== "field") {
        //   throw new Error(
        //     `Unexpected edge type for: ${edgeDefinition.name}, ` +
        //       `expected field, got ${edgeDefinition.type} `
        //   );
        // }

        const otherEnd = await this.ctx.db.get(
          doc[edgeDefinition.field] as any
        );
        if (otherEnd === null) {
          return null;
        }
        return entWrapper(otherEnd, edgeDefinition.to);
      }
    ) as any;
  }
}

function entWrapper<
  DataModel extends GenericDataModel,
  TableName extends TableNamesInDataModel<DataModel>
>(
  doc: DocumentByName<DataModel, TableName>,
  tableName: TableName
): EntByName<DataModel, TableName> {
  Object.defineProperty(doc, "edge", {
    value: (name: string) => {},
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return doc as any;
}

function tableFactory<
  DataModel extends GenericDataModel,
  EntsDataModel extends GenericEntsDataModel<DataModel>
>(ctx: GenericQueryCtx<DataModel>, entDefinitions: EntsDataModel) {
  return <Table extends TableNamesInDataModel<DataModel>>(table: Table) => {
    return new QueryPromise(ctx, entDefinitions, table);
  };
}

const query = customQuery(
  baseQuery,
  customCtx(async (ctx) => {
    return {
      table: tableFactory(ctx, entDefinitions),
      db: undefined,
    };
  })
);

type EntByName<
  DataModel extends GenericDataModel,
  TableName extends TableNamesInDataModel<DataModel>
> = Expand<DocumentByName<DataModel, TableName> & { myMethod(): null }>;

export const test = query({
  args: {},

  handler: async (ctx) => {
    {
      const firstMessageTags = await ctx.table("messages").first().edge("tags");
      return firstMessageTags;
    }
    {
      const firstUserProfile = await ctx.table("users").first().edge("profile");
      return firstUserProfile;
    }
    {
      const lastMessageAuthorsMessages = await ctx
        .table("messages")
        .first()
        .edge("user")
        .edge("messages");
      return lastMessageAuthorsMessages;
    }
    {
      const lastMessageAuthor = await ctx
        .table("messages")
        .first()
        .edge("user");
      return lastMessageAuthor;
    }
    {
      // const postsByUser = await ctx
      // .table("users")
      // .get("email", "srb@convex.dev")
      // // .edge("posts")
      // .map(async (user) => (
      //   ctx.table("posts")
      //     .withIndex("authorId", (q) => q.eq("authorId", user._id))
      // ));
    }
    {
      // const message = await ctx
      //   .table("messages")
      //   .get("authorId", "jh76hs45yga4pgptp21nxhfdx96gf8xr" as any);
      // return message;
    }

    {
      const messages = await ctx.table("messages");
      return messages;
    }
    {
      const message = await ctx.table("messages").get("123123213" as any);
      return message;
    }
    {
      const messages = await ctx.table("messages").first();
      return messages;
    }

    // // For single field indexes, we should be able to eq or lt gt directly - but that doesn't
    // // work as you might have multiple indexes with the same first field - you have to
    // // choose the index in convex model, but as Ian suggested if you choose a single field index
    // // you can inline the eq condition, so
    // await ctx.table("messages").get("author", foo._id); // note not authorId even though that's the underlying index
    // // Retrieve the posts of a user
    // // const postsByUser: Post[] = await prisma.user
    // //   .findUnique({ where: { email: "ada@prisma.io" } })
    // //   .posts();
    // const postsByUser = await ctx
    //   .table("users")
    //   .get("email", "srb@convex.dev")
    //   .edge("posts");
    // // Retrieve the profile of a user via a specific post
    // // const authorProfile: Profile | null = await prisma.post
    // // .findUnique({ where: { id: 1 } })
    // // .author()
    // // .profile();
    // const authorProfile = await ctx
    //   .table("posts")
    //   .get(1)
    //   .edge("author")
    //   .edge("profile");
    // // Return all users and include their posts and profile
    // // const users: User[] = await prisma.user.findMany({
    // //   include: {
    // //     posts: true,
    // //     profile: true,
    // //   },
    // // });
    // const users = await ctx.table("users").map(async (user) => ({
    //   ...user,
    //   posts: await user.edge("posts"),
    //   profile: await user.edge("profile"),
    // }));
    // // Select all users and all their post titles
    // // const userPosts = await prisma.user.findMany({
    // //   select: {
    // //     name: true,
    // //     posts: {
    // //       select: {
    // //         title: true,
    // //       },
    // //     },
    // //   },
    // // });
    // const userPosts = await ctx.table("users").map(async (user) => ({
    //   name: user.name,
    //   posts: await user.edge("posts"),
    // }));

    // But if I already have a user, how do I get the posts from them?
    // const user = await ctx.table("users").get("email", "srb@...");
    // const posts = await user.edge("posts");

    // // List all messages
    // // const allPosts = ctx.db.query("posts").collect();
    // const allPosts = await ctx.table("posts");
    // // const userById = ctx.db.get(id);
    // const userById = await ctx.table("posts");
    //// Read the database as many times as you need here.
    //// See https://docs.convex.dev/database/reading-data.
    // const numbers = await ctx.db
    //   .query("numbers")
    //   // Ordered by _creationTime, return most recent
    //   .order("desc")
    //   .take(args.count);
    // return numbers.toReversed().map((number) => number.value);
  },
});

export const seed = mutation(async (ctx) => {
  const userId = await ctx.db.insert("users", { name: "Stark" });
  const messageId = await ctx.db.insert("messages", {
    text: "Hello world",
    userId,
  });
  await ctx.db.insert("profiles", {
    bio: "Hello world",
    userId,
  });
  const tagsId = await ctx.db.insert("tags", {
    name: "Orange",
  });
  await ctx.db.insert("messages_to_tags" as any, {
    messagesId: messageId,
    tagsId: tagsId,
  });
});

export const list = query(async (ctx, args) => {
  return await ctx.table(args.table as any);
});

export const clear = mutation(async (ctx) => {
  for (const table of [
    "users",
    "messages",
    "profiles",
    "tags",
    "documents",
    "messages_to_tags",
  ]) {
    for (const { _id } of await ctx.db.query(table as any).collect()) {
      await ctx.db.delete(_id);
    }
  }
});
