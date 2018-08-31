'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

require('styles//DatasourceList.css');

class DatasourceListComponent extends React.Component {
  makeDatasourceButton (worksheetName) {
    return (
      <Button key={worksheetName} bsStyle='default' block
        onClick={() => this.props.onSelectWorksheet(worksheetName)}>
        {worksheetName}
      </Button>
    );
  }

  render () {
    const datasourceButtons = this.props.worksheetNames.map(worksheetName => this.makeDatasourceButton(worksheetName));
    return (
      <div>
        {datasourceButtons}
      </div>
    );
  }
}

DatasourceListComponent.displayName = 'DatasourceListComponent';

DatasourceListComponent.propTypes = {
  onSelectWorksheet: PropTypes.func,
  worksheetNames: PropTypes.array
};

export default DatasourceListComponent;
