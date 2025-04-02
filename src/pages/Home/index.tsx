import React from 'react';
import { Container, Row } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import BalanceOverview from '../DashboardCrm/BalanceOverview';
import ClosingDeals from '../DashboardCrm/ClosingDeals';
import DealsStatus from '../DashboardCrm/DealsStatus';
import DealType from '../DashboardCrm/DealType';
import MyTasks from '../DashboardCrm/MyTasks';
import SalesForecast from '../DashboardCrm/SalesForecast';
import UpcomingActivities from '../DashboardCrm/UpcomingActivities';
import Widgets from '../DashboardCrm/Widgets';

const Home = () => {
    document.title="Ana Sayfa | Velzon - React Admin & Dashboard Template";
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>                            
                    <BreadCrumb title="Ana Sayfa" pageTitle="Dashboards" />
                    <Row>
                        <Widgets />
                    </Row>
                    <Row>
                        <SalesForecast />
                        <DealType />
                        <BalanceOverview />
                    </Row>
                    <Row>
                        <DealsStatus />
                        <MyTasks />
                    </Row>
                    <Row>
                        <UpcomingActivities />
                        <ClosingDeals />
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default Home; 