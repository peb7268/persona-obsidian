/**
 * @jest-environment jsdom
 */
import { StatusBarManager } from '../StatusBar';
import { PersonaSettings, ProgressState } from '../../types';
import { MockHTMLElement } from '../../__tests__/mocks/obsidian';

describe('StatusBarManager', () => {
  let statusBarManager: StatusBarManager;
  let mockStatusBarEl: MockHTMLElement;
  let settings: PersonaSettings;

  beforeEach(() => {
    mockStatusBarEl = new MockHTMLElement();
    settings = {
      personaRoot: '/vault/Projects/Persona',
      business: 'TestBusiness',
      zettelkastenPath: 'Resources/Zettlekasten',
      duplicateThreshold: 70,
      showRibbonIcon: true,
      showStatusBar: true,
      autoProcessOnSave: false,
      pollingEnabled: false,
      pollingIntervalMinutes: 5,
    };

    statusBarManager = new StatusBarManager(mockStatusBarEl as any, settings);
  });

  describe('constructor', () => {
    it('should initialize with ready state', () => {
      expect(mockStatusBarEl.textContent).toContain('Persona');
      expect(mockStatusBarEl.textContent).toContain('TestBusiness');
    });

    it('should add CSS class to status bar element', () => {
      expect(mockStatusBarEl.classList.add).toHaveBeenCalledWith('persona-status-bar');
    });

    it('should set cursor to pointer', () => {
      expect(mockStatusBarEl.style.cursor).toBe('pointer');
    });

    it('should add click event listener', () => {
      expect(mockStatusBarEl.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });
  });

  describe('setClickHandler', () => {
    it('should register click handler', () => {
      const mockHandler = jest.fn();
      statusBarManager.setClickHandler(mockHandler);

      // Verify the callback is stored by accessing the private property
      // This tests that setClickHandler stores the callback correctly
      expect((statusBarManager as any).onClickCallback).toBe(mockHandler);
    });

    it('should replace existing click handler', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();

      statusBarManager.setClickHandler(mockHandler1);
      expect((statusBarManager as any).onClickCallback).toBe(mockHandler1);

      statusBarManager.setClickHandler(mockHandler2);
      expect((statusBarManager as any).onClickCallback).toBe(mockHandler2);
    });
  });

  describe('setReady', () => {
    it('should display business name', () => {
      statusBarManager.setReady();

      expect(mockStatusBarEl.setText).toHaveBeenCalledWith('Persona: TestBusiness');
    });

    it('should remove running and error classes', () => {
      statusBarManager.setReady();

      expect(mockStatusBarEl.classList.remove).toHaveBeenCalledWith(
        'persona-status-running'
      );
      expect(mockStatusBarEl.classList.remove).toHaveBeenCalledWith(
        'persona-status-error'
      );
    });
  });

  describe('setRunning', () => {
    it('should display agent name', () => {
      statusBarManager.setRunning('researcher');

      expect(mockStatusBarEl.createSpan).toHaveBeenCalledWith({ text: ' researcher' });
    });

    it('should add running CSS class', () => {
      statusBarManager.setRunning('researcher');

      expect(mockStatusBarEl.classList.add).toHaveBeenCalledWith(
        'persona-status-running'
      );
    });

    it('should display spinner', () => {
      statusBarManager.setRunning('researcher');

      expect(mockStatusBarEl.createSpan).toHaveBeenCalledWith({
        cls: 'persona-spinner',
      });
    });

    it('should display action when provided', () => {
      statusBarManager.setRunning('researcher', 'Analyzing data');

      expect(mockStatusBarEl.createSpan).toHaveBeenCalledWith({
        text: ': Analyzing data',
        cls: 'persona-action',
      });
    });

    it('should not display action when not provided', () => {
      statusBarManager.setRunning('researcher');

      const calls = (mockStatusBarEl.createSpan as jest.Mock).mock.calls;
      const hasActionCall = calls.some(
        (call) => call[0].cls === 'persona-action'
      );

      expect(hasActionCall).toBe(false);
    });

    it('should clear existing content before updating', () => {
      statusBarManager.setRunning('researcher');

      expect(mockStatusBarEl.empty).toHaveBeenCalled();
    });
  });

  describe('setProgress', () => {
    it('should display progress with questions', () => {
      const progress: ProgressState = {
        agent: 'researcher',
        status: 'running',
        questions_total: 5,
        questions_completed: 2,
        current_activity: '',
        started_at: Date.now(),
      };

      statusBarManager.setProgress(progress, '1m 23s');

      expect(mockStatusBarEl.createSpan).toHaveBeenCalledWith({ text: ' researcher' });
      expect(mockStatusBarEl.createSpan).toHaveBeenCalledWith({
        text: ': 2/5 questions',
        cls: 'persona-progress',
      });
      expect(mockStatusBarEl.createSpan).toHaveBeenCalledWith({
        text: ' (1m 23s)',
        cls: 'persona-elapsed',
      });
    });

    it('should display current activity when no questions', () => {
      const progress: ProgressState = {
        agent: 'summarizer',
        status: 'running',
        questions_total: 0,
        questions_completed: 0,
        current_activity: 'Processing notes',
        started_at: Date.now(),
      };

      statusBarManager.setProgress(progress, '30s');

      expect(mockStatusBarEl.createSpan).toHaveBeenCalledWith({
        text: ': Processing notes',
        cls: 'persona-activity',
      });
    });

    it('should not display activity when questions are present', () => {
      const progress: ProgressState = {
        agent: 'researcher',
        status: 'running',
        questions_total: 5,
        questions_completed: 2,
        current_activity: 'Should not display',
        started_at: Date.now(),
      };

      statusBarManager.setProgress(progress, '1m');

      const calls = (mockStatusBarEl.createSpan as jest.Mock).mock.calls;
      const hasActivityCall = calls.some(
        (call) => call[0].cls === 'persona-activity'
      );

      expect(hasActivityCall).toBe(false);
    });

    it('should display elapsed time', () => {
      const progress: ProgressState = {
        agent: 'researcher',
        status: 'running',
        questions_total: 3,
        questions_completed: 1,
        current_activity: '',
        started_at: Date.now(),
      };

      statusBarManager.setProgress(progress, '2m 45s');

      expect(mockStatusBarEl.createSpan).toHaveBeenCalledWith({
        text: ' (2m 45s)',
        cls: 'persona-elapsed',
      });
    });

    it('should add running CSS class', () => {
      const progress: ProgressState = {
        agent: 'researcher',
        status: 'running',
        questions_total: 0,
        questions_completed: 0,
        current_activity: '',
        started_at: Date.now(),
      };

      statusBarManager.setProgress(progress, '');

      expect(mockStatusBarEl.classList.add).toHaveBeenCalledWith(
        'persona-status-running'
      );
    });

    it('should clear existing content before updating', () => {
      const progress: ProgressState = {
        agent: 'researcher',
        status: 'running',
        questions_total: 0,
        questions_completed: 0,
        current_activity: '',
        started_at: Date.now(),
      };

      statusBarManager.setProgress(progress, '');

      expect(mockStatusBarEl.empty).toHaveBeenCalled();
    });
  });

  describe('setError', () => {
    it('should display error message', () => {
      statusBarManager.setError('Something went wrong');

      expect(mockStatusBarEl.setText).toHaveBeenCalledWith('Persona: Error');
    });

    it('should add error CSS class', () => {
      statusBarManager.setError('Something went wrong');

      expect(mockStatusBarEl.classList.add).toHaveBeenCalledWith(
        'persona-status-error'
      );
    });
  });

  describe('updateBusiness', () => {
    it('should update business name in settings', () => {
      statusBarManager.updateBusiness('NewBusiness');

      expect(settings.business).toBe('NewBusiness');
    });

    it('should update status bar to show new business', () => {
      statusBarManager.updateBusiness('NewBusiness');

      expect(mockStatusBarEl.setText).toHaveBeenCalledWith('Persona: NewBusiness');
    });

    it('should set ready state after updating', () => {
      // Set to running state first
      statusBarManager.setRunning('researcher');

      // Update business
      statusBarManager.updateBusiness('UpdatedBusiness');

      // Should be back in ready state
      expect(mockStatusBarEl.classList.remove).toHaveBeenCalledWith(
        'persona-status-running'
      );
      expect(mockStatusBarEl.classList.remove).toHaveBeenCalledWith(
        'persona-status-error'
      );
    });
  });
});
