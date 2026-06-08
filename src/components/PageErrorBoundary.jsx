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
      return (
        <section className="card loading-card" role="alert">
          <h2>{isAssistant ? 'AI Assistant is temporarily unavailable' : 'Section temporarily unavailable'}</h2>
          <p className="notice">
            {isAssistant
              ? 'The assistant could not load safely. No action was performed.'
              : 'This section could not load safely. No action was performed.'}
          </p>
        </section>
      );
    }

    return this.props.children;
  }
}
