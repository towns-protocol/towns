/**
 * Test schema for Drizzle adapter tests.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * Users table for testing.
 */
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    age: integer('age'),
})

/**
 * Items table for testing.
 */
export const items = sqliteTable('items', {
    id: text('id').primaryKey(),
    value: integer('value').notNull(),
    category: text('category'),
})

/**
 * Empty model table for testing.
 */
export const empty_model = sqliteTable('empty_model', {
    id: text('id').primaryKey(),
})

/**
 * Posts table for join testing (one-to-many with users).
 */
export const posts = sqliteTable('posts', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content'),
    user_id: text('user_id').notNull(),
})

/**
 * Profiles table for join testing (one-to-one with users).
 */
export const profiles = sqliteTable('profiles', {
    id: text('id').primaryKey(),
    bio: text('bio'),
    user_id: text('user_id').notNull(),
})
