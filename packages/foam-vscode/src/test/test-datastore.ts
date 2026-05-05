import micromatch from 'micromatch';
import { Logger } from '@foam/core';
import { IDataStore, IMatcher } from '@foam/core';
import { URI } from '@foam/core';
import { isWindows } from '@foam/core';
import { asAbsolutePaths } from '@foam/core';
import fs from 'fs';
import path from 'path';

function getFiles(directory: string) {
  const files = [];
  getFilesFromDir(files, directory);
  return files;
}
function getFilesFromDir(files: string[], directory: string) {
  fs.readdirSync(directory).forEach(file => {
    const absolute = path.join(directory, file);
    if (fs.statSync(absolute).isDirectory()) {
      getFilesFromDir(files, absolute);
    } else {
      files.push(absolute);
    }
  });
}
/**
 * File system based data store
 */
export class FileDataStore implements IDataStore {
  constructor(private readFile: (uri: URI) => Promise<string>, private readonly basedir: string) {}

  async list(): Promise<URI[]> {
    const res = getFiles(this.basedir);
    return res.map(URI.file);
  }

  async read(uri: URI) {
    try {
      return await this.readFile(uri);
    } catch (e) {
      Logger.error(`FileDataStore: error while reading uri: ${uri.path} - ${e}`);
      return null;
    }
  }
}

/**
 * The matcher requires the path to be in unix format, so if we are in windows
 * we convert the fs path on the way in and out
 */
export const toMatcherPathFormat = isWindows
  ? (uri: URI) => uri.toFsPath().replace(/\\/g, '/')
  : (uri: URI) => uri.toFsPath().replace(/\\/g, '/');

export const toFsPath = isWindows
  ? (path: string): string => path.replace(/\//g, '\\')
  : (path: string): string => path;

const normalizeMatcherPath = (value: string): string => value.replace(/\\/g, '/');

export class Matcher implements IMatcher {
  public readonly folders: string[];
  public readonly include: string[] = [];
  public readonly exclude: string[] = [];

  constructor(baseFolders: URI[], includeGlobs: string[] = ['**/*'], excludeGlobs: string[] = []) {
    this.folders = baseFolders.map(toMatcherPathFormat);
    Logger.info('Workspace folders: ', this.folders);

    this.include = includeGlobs
      .flatMap(glob => asAbsolutePaths(glob, this.folders))
      .map(normalizeMatcherPath);
    this.exclude = excludeGlobs
      .flatMap(glob => asAbsolutePaths(glob, this.folders))
      .map(normalizeMatcherPath);

    Logger.info('Glob patterns', {
      includeGlobs: this.include,
      ignoreGlobs: this.exclude,
    });
  }

  match(files: URI[]) {
    const candidatePaths = files.map(toMatcherPathFormat);
    const matches = micromatch(candidatePaths, this.include, {
      ignore: this.exclude,
      nocase: true,
    });
    return matches.map(URI.file);
  }

  isMatch(uri: URI) {
    return this.match([uri]).length > 0;
  }

  refresh(): Promise<void> {
    return Promise.resolve();
  }
}
