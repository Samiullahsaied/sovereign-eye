import { Component } from 'react';

export class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      const isAssistant = this.props.pageId === 'assistant';
      const t = this.props.t || ((key) => key);
      return (
        <section className="card loading-card" role="alert">
          <h2>{isAssistant ? t('assistant.unavailable') : t('common.sectionUnavailable')}</h2>
          <p className="notice">
            {isAssistant
              ? t('common.assistantSafeFailure')
              : t('common.sectionSafeFailure')}
          </p>
        </section>
      );
    }

    return this.props.children;
  }
}
