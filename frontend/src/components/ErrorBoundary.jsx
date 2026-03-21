import React from 'react';
import { GenericError } from '../pages/error/GenericError';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <GenericError message="An unexpected error occurred. Please refresh the page." />;
    }

    return this.props.children;
  }
}
