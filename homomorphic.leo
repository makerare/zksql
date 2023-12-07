// The 'retail_media_0_0_1' program.

// Homomorphic encryption of retail data.


program retail_media_0_0_1.aleo {
    struct Data {
        payload: Payload,
        metadata: Metadata,
    }

    struct EncryptedData {
        encrypted_payload: EncryptedPayload,
        metadata: Metadata,
    }

    struct Metadata {
        client: address,
        retailer: address,
        brand: address,
    }

    struct Payload {
        product_id: u128,
        quantity: field,
        price: field
    }

    struct EncryptedValue {
        c: group,
        d: group
    }

    struct EncryptedPayload {
        product_id: u128,
        encrypted_quantity: EncryptedValue,
        encrypted_price: EncryptedValue,
    }

    struct Array5 {
        a0: address,
        a1: address,
        a2: address,
        a3: address,
        a4: address,
    }

    record PrivateData {
        owner: address,
        data: Data,
    }

    record DatabaseMergeRequest {
        owner: address,
        request_id: u128,
        encrypted_data: EncryptedData,
        retailers: Array5,
        next_index: u8,
    }

    record MergeRequest {
        owner: address,
        request_id: u128,
        encrypted_data: EncryptedData,
        retailers: Array5,
        next_index: u8,
    }

    record MergeResult {
        owner: address,
        request_id: u128,
        data: Data,
        retailers: Array5
    }
    
    transition secret_to_public_key(private_key: scalar) -> group {
        return (private_key * group::GEN);
    }
    
    transition save_data(
        private payload: Payload, 
        private client: address,
        private brand: address,
    ) -> PrivateData {
        let metadata: Metadata = Metadata {
            client: client,
            retailer: self.caller,
            brand: brand,
        };
        let data: Data = Data{
            payload: payload,
            metadata: metadata,
        };
        return PrivateData {
            owner: self.caller,
            data: data,
        };
    }

    transition convey_data(
        private retailer_private_data: PrivateData,
    ) -> (PrivateData, PrivateData) {
        let out_brand_private_data: PrivateData = PrivateData{
            owner: retailer_private_data.data.metadata.brand,
            data: retailer_private_data.data,
        };
        let out_retailer_private_data: PrivateData = retailer_private_data;
        return (out_brand_private_data, retailer_private_data);
    }

    transition convey_anonymise_data(
        private retailer_private_data: PrivateData,
    ) -> (PrivateData, PrivateData) {
        let metadata: Metadata = Metadata{
            client: new_address(),
            retailer: retailer_private_data.data.metadata.retailer,
            brand: retailer_private_data.data.metadata.brand,
        };

        let out_brand_private_data: PrivateData = PrivateData {
            owner: retailer_private_data.data.metadata.brand,
            data: retailer_private_data.data,
        };
        let out_retailer_private_data: PrivateData = retailer_private_data;
        return (
            out_brand_private_data,
            out_retailer_private_data
        );
    }

    transition init_merge_request(
        private request_id: u128,
        private retailers: Array5,
    ) -> MergeRequest {
        assert_neq(retailers.a0, new_address());
        let initial_encrypted_payload: EncryptedPayload
            = EncryptedPayload {
                    product_id: 0u128,
                    encrypted_quantity: EncryptedValue {
                    c: 0group,
                    d: 0group
                },
                    encrypted_price: EncryptedValue {
                    c: 0group,
                    d: 0group
                },
            };

        let initial_encrypted_data: EncryptedData = EncryptedData {
            encrypted_payload: initial_encrypted_payload,
            metadata: Metadata{
                client: new_address(),
                retailer: new_address(),
                brand: self.caller,
            },
        };
        return MergeRequest {
            owner: retailers.a0,
            request_id: request_id,
            encrypted_data: initial_encrypted_data,
            retailers: retailers,
            next_index: 0u8,
        };
    }

    transition process_sum_request(
        private merged_request: MergeRequest,
        private private_data: PrivateData,
        private public_key: group,
        private random_pad_1: scalar,
        private random_pad_2: scalar,
        private transfer_next: bool,
    ) -> MergeRequest {
        let product_id: u128 = private_data.data.payload.product_id;
        assert_eq(
            product_id,
            merged_request.encrypted_data.encrypted_payload.product_id
        );
        assert(
            merged_request.encrypted_data.metadata.client
                == private_data.data.metadata.client 
            || 
            merged_request.encrypted_data.metadata.client
                == new_address()
        );

        let private_data_encrypted_quantity: EncryptedValue = egec_encrypt(
            private_data.data.payload.quantity,
            public_key,
            random_pad_1,
        );
        let private_data_encrypted_price: EncryptedValue = egec_encrypt(
            private_data.data.payload.price,
            public_key,
            random_pad_2,
        );

        let encrypted_quantity: EncryptedValue = sum_encrypted_values(
            merged_request.encrypted_data.encrypted_payload.encrypted_quantity,
            private_data_encrypted_quantity
        );
        let encrypted_price: EncryptedValue = sum_encrypted_values(
            merged_request.encrypted_data.encrypted_payload.encrypted_price,
            private_data_encrypted_price
        );
        let merged_payload: EncryptedPayload = EncryptedPayload {
            product_id: product_id,
            encrypted_quantity: encrypted_quantity,
            encrypted_price: encrypted_price
        };

        let retailers: Array5 = merged_request.retailers;
        let next_index: u8 = (
            transfer_next ? (
                merged_request.next_index + 1u8
            ) : merged_request.next_index
        );
        let next_retailer: address = array5_at(retailers, next_index);
        let next_owner: address = (
            next_retailer == new_address() ? (
                merged_request.encrypted_data.metadata.brand
            ) : next_retailer
        );
        
        let metadata: Metadata = Metadata {
            client: 
                next_retailer == new_address() ? (
                    new_address()
                ) : merged_request.encrypted_data.metadata.client,
            retailer: new_address(),
            brand: merged_request.encrypted_data.metadata.brand,
        };

        let encrypted_data: EncryptedData = EncryptedData {
            encrypted_payload: merged_payload,
            metadata: metadata,
        };

        return MergeRequest {
            owner: next_owner,
            request_id: merged_request.request_id,
            encrypted_data: encrypted_data,
            retailers: retailers,
            next_index: next_index,
        };
    }

    transition retrieve_merge_result(
        merge_request: MergeRequest,
        secret_key: scalar,
    ) -> MergeResult {
        let encrypted_payload: EncryptedPayload = (
            merge_request.encrypted_data.encrypted_payload
        );
        let payload: Payload = Payload {
            product_id: encrypted_payload.product_id,
            quantity: egec_decrypt(
                encrypted_payload.encrypted_quantity,
                secret_key,
            ),
            price: egec_decrypt(
                encrypted_payload.encrypted_price,
                secret_key,
            ),
        };
        return MergeResult {
            owner: self.caller,
            request_id: merge_request.request_id,
            data: Data {
                payload: payload,
                metadata: merge_request.encrypted_data.metadata,
            },
            retailers: merge_request.retailers,
        };
    }
    

    inline sum_encrypted_values(
        encrypted_value_1: EncryptedValue, 
        encrypted_value_2: EncryptedValue
    ) -> EncryptedValue {
        return EncryptedValue {
            c: encrypted_value_1.c + encrypted_value_2.c,
            d: encrypted_value_1.d + encrypted_value_2.d,
        };
    }

    inline new_address() -> address {
        return aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
    }

    inline array5_at(array5: Array5, index: u8) -> address {
        return (
            index == 0u8 ? (
                array5.a0
            ) : index == 1u8 ? (
                array5.a1
            ) : index == 2u8 ? (
                array5.a2
            ) : index == 3u8 ? (
                array5.a3
            ) : index == 4u8 ? (
                array5.a4
            ) : new_address()
        );
    }

    inline egec_encrypt(
        value: field,
        public_key: group,
        random_pad: scalar,
    ) -> EncryptedValue {
        let value_encoded: group = encode_field_to_group(value);
        return EncryptedValue {
            c: random_pad * group::GEN,
            d: random_pad * public_key + value_encoded,
        };
    }
    inline egec_decrypt(
        encrypted_value: EncryptedValue,
        secret_key: scalar,
    ) -> field {
        return decode_group_to_field(
            encrypted_value.d - secret_key * encrypted_value.c
        );
    }

    inline encode_field_to_group(decoded: field) -> group {
        return ((decoded as scalar) * group::GEN);
    }
    inline decode_group_to_field(encoded: group) -> field{
        return (
            encoded == 0group ? 0field :
            encoded == 1540945439182663264862696551825005342995406165131907382295858612069623286213group ? 1field :
            encoded == 5590605292024517265597315631417857783821393496586845663408435938809189783796group ? 2field :
            encoded == 2034432907670544926578950615729308855022109862836382821587587556838134033488group ? 3field :
            encoded == 6117035946803170724321753447917904059388535517132324955943146360217241488209group ? 4field :
            encoded == 740068907480936373950668748872490387690131780448740080570673938653468552572group ? 5field :
            encoded == 687475296343713801186278364036268866931356240883957580365680239411311287304group ? 6field :
            encoded == 4055712382803691709583036445052370632653408663345390698409289372068899957899group ? 7field :
            encoded == 5155112803281012180043065891748033872635960295612233639484412347542397146155group ? 8field :
            encoded == 8310470451327784259433701286278372222711771509074510053602846192649573095852group ? 9field :
            encoded == 1417256330125559904063759111272648668898085277057449749007295419029317022870group ? 10field :
            encoded == 3611393032469419378921795219975951659414651979434693173334291740340316916202group ? 11field :
            encoded == 4574013824615165340553264559400235805969706554664624151854651122407761286942group ? 12field :
            encoded == 1980437386924079089548487844281096439480544767349403651765433556848521091420group ? 13field :
            encoded == 1336524079395349529271553396335294585113164191953434579975462299016267297022group ? 14field :
            encoded == 2446195051211040192314379944668165298582817619341332003926249454098771070676group ? 15field :
            encoded == 3956461078231622306798730723460632891503774893505743239865859596141979683928group ? 16field :
            encoded == 3757354547824593978533818986642172987806808258699343972677616427902125125948group ? 17field :
            encoded == 1649999690931990267197398664712867720866968571457657295660657142948176256126group ? 18field :
            encoded == 1741197946871266771301644697398136508617769233347114055798834322217983582113group ? 19field :
            encoded == 7673990587486747825524243097481983171008674471515695755262526568736039448177group ? 20field :
            encoded == 6010452253244033340013796589314197476127282809402389395736134503906320030929group ? 21field :
            encoded == 3416149331293964537931552840999189146878433080739016171219271923094849271567group ? 22field :
            encoded == 303374026205536307265549499676332417410372625484883448764138963203443206570group ? 23field :
            encoded == 1012724389455983722969925575280498998671681909112607214656175111394552227090group ? 24field :
            encoded == 3423051668729909910842315780011539290545574387527559470485898161458405400108group ? 25field :
            encoded == 6552331608664367370236216742090398243257974585265714725827164609197147286591group ? 26field :
            encoded == 6024243036782921927043482802796435974959138743567983870063657426097543514960group ? 27field :
            encoded == 812889971372391984238140175691774620446342207608330354391433033604719069837group ? 28field :
            encoded == 3947378039790287359828410123751216495517665798848681061126302462248050843869group ? 29field :
            encoded == 4304923182586760168823481549468341893707316317323681682215348749296701869946group ? 30field :
            encoded == 6310165825940360638917317719480219404145688676974080917831115268254216245105group ? 31field :
            encoded == 5432828598012686134081855501883846584360612080827676899943299353827748288655group ? 32field :
            encoded == 5523501266128266770606271184587282001082783020735753700467443195803456187561group ? 33field :
            encoded == 5150121550716419058271597131781158224575723764687782354746233768059243932493group ? 34field :
            encoded == 7429549001332502125638044496264899272140581115508847648797828967932886759946group ? 35field :
            encoded == 1275882293589483306398301356281018023633521771361031249390776504329783673591group ? 36field :
            encoded == 4311371583406672308866530833332460500511658302844280606393263264554590162866group ? 37field :
            encoded == 5562140389487824550627276739101084862535751724286980784914531703502168212757group ? 38field :
            encoded == 526330222462842933128070061854655847105255926473978700969803989493327891579group ? 39field :
            encoded == 7363969918312939078153501948336903671920741782542370236454875849611840145394group ? 40field :
            encoded == 8181524386996311126524878172736958953768713732344071398269483477873696836490group ? 41field :
            encoded == 121908165920757369807594489035491109852042007264351423295229227131268449364group ? 42field :
            encoded == 2625026913107852026095580886298760305764174482422821287631003605093395598168group ? 43field :
            encoded == 7388478199210219574814909292628095453233899069137672458584503287243261271048group ? 44field :
            encoded == 65972371447563606933252477273449916510869756704240463595325444224676334480group ? 45field :
            encoded == 3149170144934402326645485031967888316211206018415256638798326810571641285292group ? 46field :
            encoded == 4838058360000056908335710252190771137473703460271243376251793890368400417075group ? 47field :
            encoded == 7361417092262934291419457586905973015520818450535070313741506640641857287010group ? 48field :
            encoded == 7798248657589090101412797606513420913421514267987705171025210823417021111453group ? 49field :
            encoded == 6480649246301288886700268156416438202433958242280461830689568438462849396345group ? 50field :
            encoded == 3374875214077861290427707831814282996508475838217511859979483699827845106126group ? 51field :
            encoded == 3515594955260747960947278079259340286714810494707459135832921777525421689866group ? 52field :
            encoded == 6390424531024478891533358718195915759197386921783641256822016343652106263606group ? 53field :
            encoded == 2864892673267474954526338099359373744060481346788595079380020562991590770983group ? 54field :
            encoded == 4172035616935845031008613519194264841043056875819859660567032317025954506368group ? 55field :
            encoded == 1701684342342746579962359113424089281449955703786576060082362662936040620579group ? 56field :
            encoded == 6378643707481618069056536341740901186283375852405962909100481368793514097727group ? 57field :
            encoded == 3998313814140011498329482383853894242380050384894234797514152663685275378727group ? 58field :
            encoded == 6366077178419994073143086373791251819654147934620970505643209384151844181302group ? 59field :
            encoded == 5298898474174283832280470402129319850496871612975759243315626086111949390476group ? 60field :
            encoded == 6519063415714599186703930989568953978851482937762645970896316266226954175493group ? 61field :
            encoded == 73186332251971154891589392519783932935490533551605499252054642409356318193group ? 62field :
            encoded == 6419182449570958581489241263052621333689746928038989903332846651251575846978group ? 63field :
            encoded == 6734992897313876589192114087052391574142830556106972564843786068122990444226group ? 64field :
            encoded == 3963673469162717264317246049026867764034207053500124454735088976129455789585group ? 65field :
            encoded == 2713248160920183831603629357074822045744101293416761579187779411923281513726group ? 66field :
            encoded == 1797214499251940084971617575648869641381923998833428933370058569981591703462group ? 67field :
            encoded == 568792714207999412746445477022216327158942560511839473166357232588749340585group ? 68field :
            encoded == 5313387987998012713799764023741320638415303229320514701427978346599370305972group ? 69field :
            encoded == 1140809087217650851908405186231179704375403669602494727791912486500687784311group ? 70field :
            encoded == 66660433537290984742710084006588999021134954134117976703233384016152894144group ? 71field :
            encoded == 5225841457475620313733131143852368542564701238594169653087564760155809497886group ? 72field :
            encoded == 2462708124272017224045418355343634408192681944666944396135891330713281621635group ? 73field :
            encoded == 6277104915960377302704714446286502133857367743199832167290359232534404108739group ? 74field :
            encoded == 3722143114862963592486163526450333444310878977502649911819116261995329702281group ? 75field :
            encoded == 3386662164725524039049942990230475208468995992090192583025500094276100625294group ? 76field :
            encoded == 6050278570169288352398640717346433646080666751806460030563677256385156801772group ? 77field :
            encoded == 2652531133310763817321613876231793026761872513124071219948821371436865325481group ? 78field :
            encoded == 7526563010483995944729239086544806445428518155464361194575119522997999227824group ? 79field :
            encoded == 4628540213204472840563586994343450996710581297520743218097980144337219506082group ? 80field :
            encoded == 3845112692753977232715787028169794744290196291119239475155512629338839207834group ? 81field :
            encoded == 1687714273855370580847560469515631920442708973682221656341611570598761047548group ? 82field :
            encoded == 366200713461193929279784893891802726296285599629079275322355341507462239981group ? 83field :
            encoded == 1134197177347143464437029185272355907383704197367180393765593867634036845071group ? 84field :
            encoded == 6854095140500131595244121003215978737028192556076710613471239315434936712607group ? 85field :
            encoded == 4818148788976585207962924262049264217467825468033422272842767925038390615844group ? 86field :
            encoded == 3827425001663584648481630918221056921232528494653319401409068438238977490825group ? 87field :
            encoded == 182803312476155445050231572520878704115440505486345458775631198973685841826group ? 88field :
            encoded == 3623359405670807751686823710865429410755283620006216430214592943129541480659group ? 89field :
            encoded == 2842121909351590708660416967923426529059267873258336271968003567495346595222group ? 90field :
            encoded == 5551447000384479674470519757585309585794131016673798290958903420719193666993group ? 91field :
            encoded == 5092605634260022116696922864825417789156309135164348593019753781594950370246group ? 92field :
            encoded == 4525087810731566980914199301516579274354184518521234783570898661740697333736group ? 93field :
            encoded == 514270240774637584076118200794485855319346836051207722386479575463951867360group ? 94field :
            encoded == 94869415673049888354780254905623361087797421944386840876268450055045568259group ? 95field :
            encoded == 6687620917291977455229971208359688593555233837175453490733048607314023510700group ? 96field :
            encoded == 7026900185951117505299256418186033311331959653244721533783333888895552262644group ? 97field :
            encoded == 7207640069377563002843326267411988345530540714916548010241184518049756999115group ? 98field :
            encoded == 2870506254662587547554652051639581875197348173898390771700272497748391683322group ? 99field :
            encoded == 5801041337853953499090422907301939989035143635190339461242713810676378158876group ? 100field :
            encoded == 8203102516281917441713604509746079534013115292149291458190533032264861908333group ? 101field :
            encoded == 214819653967807697772300392042197738662170713683878301978003360428222675078group ? 102field :
            encoded == 5557380181844710661623297331687792454618054288789543158213776154987405460832group ? 103field :
            encoded == 3723857258534922944299250813885029991356748137024383450653885863943452482115group ? 104field :
            encoded == 2800967422050290997468016840368353081080894318995108914256036261371797260292group ? 105field :
            encoded == 2773865923038783831629845585882237935426150664181292463398530150207347366904group ? 106field :
            encoded == 6685609812945119675396344603818724274516928735597212836626944290453674749930group ? 107field :
            encoded == 5836818087668124440542523237017149091282682260138966427939213771932559574043group ? 108field :
            encoded == 6696031993052163040303133756688468824116669428476217674763981029747361576128group ? 109field :
            encoded == 5171025292169209370695674533658698940974772910092099105281071259155757159383group ? 110field :
            encoded == 7527232242389582426838469059064010348468207845440001380804660533975104795205group ? 111field :
            encoded == 4890391733290169233282588386282665075177945727705116832959993493460418233542group ? 112field :
            encoded == 7423473074030105908562814966885534327900420678137228410611462238975105447026group ? 113field :
            encoded == 73755009198953058304269303315025162351460419348353901880916249348735683663group ? 114field :
            encoded == 1453064847680398435810760008794988237971558639265257558091744258228091381409group ? 115field :
            encoded == 4283802783947224805705316061750277139672277954035040113798218833803296920810group ? 116field :
            encoded == 1481529084308706232300497298587664532612583227093673170670948568867394138704group ? 117field :
            encoded == 7098549293336483684596576879617344825233756856516284945653709437404271102564group ? 118field :
            encoded == 1514049142575281291341403886587690719306005079259734382444921332119233664272group ? 119field :
            encoded == 4190652196905461187978999368198205638516813096051313212649753782088001914956group ? 120field :
            encoded == 6182932579897076529380020565720126614726152257232408006088230108616215958917group ? 121field :
            encoded == 4048845804828185830690398509769462892973489088608590695589539888395427670930group ? 122field :
            encoded == 1797703756701005068367814872711215461970914069350527512568589135384138170534group ? 123field :
            encoded == 6419540056482079792592900168862239973362541858638312472645266330119370961108group ? 124field :
            encoded == 2283512850634225944756388045487706728237454236161124698737545634990278760666group ? 125field :
            encoded == 4815856065212286924253823720545579904058373180888587847850866015544456934202group ? 126field :
            encoded == 8189526572074125983457464977950416452497559589655076408496334693938473768800group ? 127field :
            0field
        );
    }
}
