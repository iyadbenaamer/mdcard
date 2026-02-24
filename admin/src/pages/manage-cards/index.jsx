import { useSearchParams } from "react-router-dom";

import Layout from "layout";
import Breadcrumb from "components/Breadcrumb";
import Categories from "./Categories";
import CardType from "./CardType";
import CardTier from "./CardTier";
import Category from "./Category";

const ManageCards = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("categoryId");
  const cardType = searchParams.get("cardTypeId");
  const cardTier = searchParams.get("cardTierId");

  return (
    <Layout>
      <div className="px-4 pt-6" dir="rtl">
        <Breadcrumb />
      </div>
      {cardTier ? (
        <CardTier />
      ) : cardType ? (
        <CardType />
      ) : category ? (
        <Category />
      ) : (
        <Categories />
      )}
    </Layout>
  );
};

export default ManageCards;
