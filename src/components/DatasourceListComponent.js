'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

require('styles//DatasourceList.css');

class DatasourceListComponent extends React.Component {
  makeDatasourceButton (datasourceName) {
    return (
      <Button key={datasourceName} bsStyle='default' block
        onClick={() => this.props.onSelectDatasource(datasourceName)}>
        {datasourceName}
      </Button>
    );
  }

  render () {
    const datasourceButtons = this.props.datasourceNames.map(datasourceName => this.makeDatasourceButton(datasourceName));
    return (
      <div>
        {datasourceButtons}
      </div>
    );
  }
}

DatasourceListComponent.displayName = 'DatasourceListComponent';

DatasourceListComponent.propTypes = {
  onSelectDatasource: PropTypes.func,
  datasourceNames: PropTypes.array
};

export default DatasourceListComponent;
