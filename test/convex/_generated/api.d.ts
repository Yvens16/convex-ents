/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * Generated by convex@1.8.0.
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as cascade from "../cascade.js";
import type * as functions from "../functions.js";
import type * as paginate from "../paginate.js";
import type * as read from "../read.js";
import type * as rules from "../rules.js";
import type * as testSuite from "../testSuite.js";
import type * as types from "../types.js";
import type * as typesTest from "../typesTest.js";
import type * as write from "../write.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  cascade: typeof cascade;
  functions: typeof functions;
  paginate: typeof paginate;
  read: typeof read;
  rules: typeof rules;
  testSuite: typeof testSuite;
  types: typeof types;
  typesTest: typeof typesTest;
  write: typeof write;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
