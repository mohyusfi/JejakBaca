export class Router {
  constructor() {
    this.routes = [];
  }

  /**
   * Menambahkan rute ke dalam router
   * @param {string} method
   * @param {string} pathPattern
   * @param  {...Function} handlers
   */
  add(method, pathPattern, ...handlers) {
    const paramNames = [];
    const regexPattern = pathPattern
      .replace(/\//g, '\\/')
      .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^\\/]+)';
      });

    const regex = new RegExp(`^${regexPattern}$`);

    this.routes.push({
      method: method.toUpperCase(),
      path: pathPattern,
      regex,
      paramNames,
      handlers: handlers.flat(),
    });

    return this;
  }

  get(path, ...handlers) {
    return this.add('GET', path, ...handlers);
  }

  post(path, ...handlers) {
    return this.add('POST', path, ...handlers);
  }

  put(path, ...handlers) {
    return this.add('PUT', path, ...handlers);
  }

  patch(path, ...handlers) {
    return this.add('PATCH', path, ...handlers);
  }

  delete(path, ...handlers) {
    return this.add('DELETE', path, ...handlers);
  }

  options(path, ...handlers) {
    return this.add('OPTIONS', path, ...handlers);
  }

  /**
   * Mencocokkan method dan pathname dengan rute yang terdaftar
   * @param {string} method
   * @param {string} pathname
   * @returns {{ route: object, params: Record<string, string> } | null}
   */
  match(method, pathname) {
    const upperMethod = method.toUpperCase();
    for (const route of this.routes) {
      if (route.method === upperMethod) {
        const match = pathname.match(route.regex);
        if (match) {
          const params = {};
          route.paramNames.forEach((name, index) => {
            params[name] = decodeURIComponent(match[index + 1]);
          });
          return { route, params };
        }
      }
    }
    return null;
  }
}

export default Router;
