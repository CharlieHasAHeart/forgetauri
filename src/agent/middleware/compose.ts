export type MiddlewareHandler<TContext, TResult> = (context: TContext) => Promise<TResult>;

export type Middleware<TContext, TResult> = (
  context: TContext,
  next: MiddlewareHandler<TContext, TResult>
) => Promise<TResult>;

export const composeMiddlewares = <TContext, TResult>(
  middlewares: Array<Middleware<TContext, TResult>>,
  terminal: MiddlewareHandler<TContext, TResult>
): MiddlewareHandler<TContext, TResult> => {
  return middlewares.reduceRight<MiddlewareHandler<TContext, TResult>>(
    (next, middleware) => {
      return async (context) => middleware(context, next);
    },
    terminal
  );
};
