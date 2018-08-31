import * as React from 'react';
import ContextMenuTrigger from 'react-contextmenu/modules/ContextMenuTrigger';

class CellFormatter extends React.PureComponent {
  getClickData(props) {
    return props.originalProps;
  }

  render() {
    let content = React.createElement(
      'div', {
        style: {
          userSelect: 'none',
          'WebkitUserSelect': 'none',
          'msUserSelect': 'none',
          'MozUserSelect': 'none',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
        title: this.props.value
      },
      this.props.value);

      return (
        <ContextMenuTrigger id='copyMenu' collect={this.getClickData} originalProps={this.props}>
          {content}
        </ContextMenuTrigger>
      );
  }
}

const CellFormatterFactory = React.createFactory(CellFormatter);

export { CellFormatterFactory };
