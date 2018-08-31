import * as React from 'react';

class CellFormatter extends React.PureComponent {
  getClickData(props) {
    return props.originalProps;
  }

  render() {
    return React.createElement(
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
  }
}

const CellFormatterFactory = React.createFactory(CellFormatter);

export { CellFormatterFactory };
