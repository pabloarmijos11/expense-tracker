import { TestBed } from '@angular/core/testing';
import { fakeFirebase } from '../core/tokens/firebase.fake';
import { ExpenseService } from './expense';

describe('ExpenseService', () => {
  let service: ExpenseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...fakeFirebase().providers,
      ],
    });
    service = TestBed.inject(ExpenseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
