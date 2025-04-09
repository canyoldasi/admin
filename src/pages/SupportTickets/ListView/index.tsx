import React from 'react';
import { Container, Row } from 'reactstrap';
import BreadCrumb from '../../../Components/Common/BreadCrumb';
import Widgets from './Widgets';
import TicketsData from './TicketsData';

const ListView = () => {
  document.title="Tickets List | Agiletech CRM";

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>                    
                    <BreadCrumb title="Tickets List" pageTitle="Tickets" />
                    <Row>
                        <Widgets />
                    </Row>
                    <TicketsData />
                </Container>
            </div>
        </React.Fragment>
    );
};

export default ListView;