import { TestBed } from '@angular/core/testing';
import { ResolveFn, provideRouter } from '@angular/router';
import { fakeFirebase } from '../tokens/firebase.fake';

import { expenseResolver } from './expense-resolver';

describe('expenseResolver', () => {
  const executeResolver: ResolveFn<unknown> = (...resolverParameters) =>
    TestBed.runInInjectionContext(() => expenseResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ...fakeFirebase().providers,
      ],
    });
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
